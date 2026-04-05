//! Real Proxmox VE client backed by the REST API over HTTPS.

use async_trait::async_trait;
use reqwest::{header, Client};
use serde::Deserialize;
use tokio::time::Duration;
use tracing::info;

use crate::{
    config::AppConfig,
    models::command::CommandExecutionRecord,
    proxmox::{
        client::ProxmoxClient,
        types::{
            ContainerInterface, ContainerMetrics, ContainerRuntimeStatus, CreateContainerRequest,
        },
    },
    utils::error::ApiError,
};

/// Proxmox VE REST client using API token authentication.
pub struct HttpProxmoxClient {
    client: Client,
    base_url: String,
    node: String,
    auth_header: String,
}

/// Generic Proxmox API response wrapper.
#[derive(Deserialize)]
struct PveResponse<T> {
    data: T,
}

/// Status payload from `/lxc/{vmid}/status/current`.
#[derive(Deserialize)]
struct StatusData {
    status: String,
    /// Present when Proxmox has placed a lock on the CT (e.g. "disk" during clone).
    #[serde(default)]
    lock: Option<String>,
    #[serde(default)]
    cpu: f64,
    #[serde(default)]
    mem: u64,
    #[serde(default)]
    maxmem: u64,
    #[serde(default)]
    netin: u64,
    #[serde(default)]
    netout: u64,
}

/// Next available VMID response.
#[derive(Deserialize)]
struct NextIdResponse {
    data: String,
}

/// Task status payload from `/nodes/{node}/tasks/{upid}/status`.
#[derive(Deserialize, Debug)]
struct TaskStatus {
    status: String,
    #[serde(default)]
    exitstatus: Option<String>,
}

impl HttpProxmoxClient {
    /// Creates a new Proxmox client from app config.
    pub fn new(config: &AppConfig) -> Result<Self, ApiError> {
        let auth_header = format!(
            "PVEAPIToken={}={}",
            config.proxmox_api_token_id, config.proxmox_api_token_secret
        );

        // Build default headers — always include auth, optionally CF Access.
        let mut default_headers = header::HeaderMap::new();
        if !config.cf_access_client_id.is_empty() {
            default_headers.insert(
                header::HeaderName::from_static("cf-access-client-id"),
                header::HeaderValue::from_str(&config.cf_access_client_id)
                    .map_err(|e| ApiError::internal(format!("Invalid CF_ACCESS_CLIENT_ID: {e}")))?,
            );
            default_headers.insert(
                header::HeaderName::from_static("cf-access-client-secret"),
                header::HeaderValue::from_str(&config.cf_access_client_secret).map_err(|e| {
                    ApiError::internal(format!("Invalid CF_ACCESS_CLIENT_SECRET: {e}"))
                })?,
            );
        }

        // Proxmox typically uses self-signed certs; accept them.
        let client = Client::builder()
            .default_headers(default_headers)
            .danger_accept_invalid_certs(true)
            .build()
            .map_err(|e| ApiError::internal(format!("Failed to build HTTP client: {e}")))?;

        Ok(Self {
            client,
            base_url: config.proxmox_api_url.trim_end_matches('/').to_string(),
            node: config.proxmox_node.clone(),
            auth_header,
        })
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }

    fn node_url(&self, path: &str) -> String {
        format!("{}/nodes/{}{}", self.base_url, self.node, path)
    }

    async fn post_action(&self, ctid: i32, action: &str) -> Result<(), ApiError> {
        let url = self.node_url(&format!("/lxc/{ctid}/status/{action}"));
        let resp = self
            .client
            .post(&url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox {action} failed: {e}")))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Proxmox {action} error: {body}"
            )));
        }
        Ok(())
    }
}

#[async_trait]
impl ProxmoxClient for HttpProxmoxClient {
    async fn create_container(&self, request: CreateContainerRequest) -> Result<i32, ApiError> {
        // Get next available VMID.
        let next_id_resp: NextIdResponse = self
            .client
            .get(&self.url("/cluster/nextid"))
            .header(header::AUTHORIZATION, &self.auth_header)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to get next VMID: {e}")))?
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse next VMID: {e}")))?;

        let vmid: i32 = next_id_resp
            .data
            .parse()
            .map_err(|e| ApiError::internal(format!("Invalid VMID: {e}")))?;

        // Wait for the template CT to be free before cloning — Proxmox locks it
        // for the duration of any full clone task spawned from it.
        info!(
            template_ctid = request.template_ctid,
            "waiting for template CT to be unlocked before clone"
        );
        self.wait_for_unlock(request.template_ctid, 120).await?;
        info!(
            template_ctid = request.template_ctid,
            "template CT is unlocked, proceeding with clone"
        );

        // Clone from the template container.
        let params = vec![
            ("newid".to_string(), vmid.to_string()),
            ("hostname".to_string(), request.hostname),
            ("full".to_string(), "1".to_string()),
        ];

        let clone_url = self.node_url(&format!("/lxc/{}/clone", request.template_ctid));
        info!(vmid, template_ctid = request.template_ctid, %clone_url, "sending clone request to Proxmox");
        let resp = self
            .client
            .post(&clone_url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .form(&params)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox clone failed: {e}")))?;

        let clone_status = resp.status();
        let clone_body = resp.text().await.unwrap_or_default();
        info!(vmid, status = clone_status.as_u16(), body = %clone_body, "clone response received");
        if !clone_status.is_success() {
            return Err(ApiError::internal(format!(
                "Proxmox clone error: {clone_body}"
            )));
        }

        // Parse the UPID from the clone response and wait for the task to finish.
        // Polling the task API is the only reliable way to know the clone (and its
        // disk lock on the template + create lock on the new CT) is truly done.
        let upid = serde_json::from_str::<serde_json::Value>(&clone_body)
            .ok()
            .and_then(|v| v["data"].as_str().map(|s| s.to_string()))
            .ok_or_else(|| ApiError::internal("Clone response contained no UPID".to_string()))?;
        info!(vmid, %upid, "clone task started, waiting for completion via task API");
        self.wait_for_task(&upid, 120).await?;
        info!(vmid, "clone task complete, applying resource limits");

        // Apply CPU, memory, and network config to the cloned container.
        let config_params = vec![
            (
                "cores".to_string(),
                request.resource_limits.cpu_cores.to_string(),
            ),
            (
                "memory".to_string(),
                request.resource_limits.memory_mb.to_string(),
            ),
            (
                "net0".to_string(),
                "name=eth0,bridge=vmbr0,ip=dhcp".to_string(),
            ),
        ];

        let config_url = self.node_url(&format!("/lxc/{vmid}/config"));
        info!(vmid, %config_url, "sending config update request");
        let config_resp = self
            .client
            .put(&config_url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .form(&config_params)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox config update failed: {e}")))?;

        let config_status = config_resp.status();
        let config_body = config_resp.text().await.unwrap_or_default();
        info!(vmid, status = config_status.as_u16(), body = %config_body, "config update response received");
        if !config_status.is_success() {
            return Err(ApiError::internal(format!(
                "Proxmox config update error: {config_body}"
            )));
        }

        // Wait for Proxmox to release the disk lock set during the clone task.
        info!(
            vmid,
            "waiting for new container disk lock to clear before resize"
        );
        self.wait_for_unlock(vmid, 120).await?;
        info!(vmid, "disk lock cleared, sending resize request");

        // Resize the rootfs disk to the requested size via the dedicated resize API.
        // Setting rootfs via PUT /config on an already-cloned disk is not supported by Proxmox.
        let resize_params = vec![
            ("disk".to_string(), "rootfs".to_string()),
            (
                "size".to_string(),
                format!("{}G", request.resource_limits.disk_gb),
            ),
        ];

        let resize_url = self.node_url(&format!("/lxc/{vmid}/resize"));
        info!(vmid, disk_gb = request.resource_limits.disk_gb, %resize_url, "sending disk resize request");
        let resize_resp = self
            .client
            .put(&resize_url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .form(&resize_params)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox disk resize failed: {e}")))?;

        let resize_status = resize_resp.status();
        let resize_body = resize_resp.text().await.unwrap_or_default();
        info!(vmid, status = resize_status.as_u16(), body = %resize_body, "resize response received");
        if !resize_status.is_success() {
            return Err(ApiError::internal(format!(
                "Proxmox disk resize error: {resize_body}"
            )));
        }

        // Resize is also an async Proxmox task — wait for it to finish so that
        // the disk lock is fully released before the caller tries to start the CT.
        if let Some(upid) = serde_json::from_str::<serde_json::Value>(&resize_body)
            .ok()
            .and_then(|v| v["data"].as_str().map(|s| s.to_string()))
        {
            info!(vmid, %upid, "resize task started, waiting for completion");
            self.wait_for_task(&upid, 120).await?;
            info!(vmid, "resize task complete");
        }

        info!(vmid, "proxmox container cloned and configured");
        Ok(vmid)
    }

    async fn start_container(&self, ctid: i32) -> Result<(), ApiError> {
        self.post_action(ctid, "start").await
    }

    async fn stop_container(&self, ctid: i32) -> Result<(), ApiError> {
        self.post_action(ctid, "stop").await
    }

    async fn restart_container(&self, ctid: i32) -> Result<(), ApiError> {
        self.post_action(ctid, "reboot").await
    }

    async fn exec_command(
        &self,
        _ctid: i32,
        _command: &CommandExecutionRecord,
    ) -> Result<(), ApiError> {
        // pct exec is not exposed via REST API — will use SSH instead.
        Err(ApiError::not_implemented(
            "exec via Proxmox API is not supported; use SSH",
        ))
    }

    async fn container_status(&self, ctid: i32) -> Result<ContainerRuntimeStatus, ApiError> {
        let url = self.node_url(&format!("/lxc/{ctid}/status/current"));
        let resp: PveResponse<StatusData> = self
            .client
            .get(&url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox status failed: {e}")))?
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse status: {e}")))?;

        match resp.data.status.as_str() {
            "running" => Ok(ContainerRuntimeStatus::Running),
            "stopped" => Ok(ContainerRuntimeStatus::Stopped),
            _ => Ok(ContainerRuntimeStatus::Unknown),
        }
    }

    async fn container_metrics(&self, ctid: i32) -> Result<ContainerMetrics, ApiError> {
        let url = self.node_url(&format!("/lxc/{ctid}/status/current"));
        let resp: PveResponse<StatusData> = self
            .client
            .get(&url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox metrics failed: {e}")))?
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse metrics: {e}")))?;

        let d = resp.data;
        Ok(ContainerMetrics {
            cpu_percent: (d.cpu * 100.0) as f32,
            memory_used_mb: (d.mem / 1_048_576) as u32,
            memory_limit_mb: (d.maxmem / 1_048_576) as u32,
            network_rx_bytes: d.netin,
            network_tx_bytes: d.netout,
        })
    }

    async fn create_snapshot(&self, ctid: i32, name: &str) -> Result<(), ApiError> {
        let url = self.node_url(&format!("/lxc/{ctid}/snapshot"));
        let resp = self
            .client
            .post(&url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .form(&[("snapname", name)])
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox snapshot failed: {e}")))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Proxmox snapshot error: {body}"
            )));
        }
        Ok(())
    }

    async fn create_bridge(&self, bridge_id: i32) -> Result<(), ApiError> {
        let bridge_name = format!("vmbr{bridge_id}");
        let url = self.node_url("/network");

        // Create the bridge device.
        let resp = self
            .client
            .post(&url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .form(&[
                ("iface", bridge_name.as_str()),
                ("type", "bridge"),
                ("autostart", "1"),
                ("comments", "hzel-private-network"),
            ])
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox create bridge failed: {e}")))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Proxmox create bridge error: {body}"
            )));
        }

        // Apply the pending network configuration change.
        self.apply_network_config().await
    }

    async fn delete_bridge(&self, bridge_name: &str) -> Result<(), ApiError> {
        let url = self.node_url(&format!("/network/{bridge_name}"));

        let resp = self
            .client
            .delete(&url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox delete bridge failed: {e}")))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Proxmox delete bridge error: {body}"
            )));
        }

        self.apply_network_config().await
    }

    async fn attach_container_nic(
        &self,
        ctid: i32,
        net_index: u8,
        bridge: &str,
        ip: &str,
        prefix_len: u8,
    ) -> Result<(), ApiError> {
        let url = self.node_url(&format!("/lxc/{ctid}/config"));
        let net_key = format!("net{net_index}");
        let eth_name = format!("eth{net_index}");
        // Static IP, no default gateway (private network — containers route only within CIDR).
        let net_val = format!("name={eth_name},bridge={bridge},ip={ip}/{prefix_len},firewall=0");

        let resp = self
            .client
            .put(&url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .form(&[(net_key.as_str(), net_val.as_str())])
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox attach NIC failed: {e}")))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Proxmox attach NIC error: {body}"
            )));
        }
        Ok(())
    }

    async fn detach_container_nic(&self, ctid: i32, net_index: u8) -> Result<(), ApiError> {
        let url = self.node_url(&format!("/lxc/{ctid}/config"));
        let net_key = format!("net{net_index}");

        let resp = self
            .client
            .put(&url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .form(&[("delete", net_key.as_str())])
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox detach NIC failed: {e}")))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Proxmox detach NIC error: {body}"
            )));
        }
        Ok(())
    }

    async fn get_container_ip(&self, ctid: i32) -> Result<String, ApiError> {
        let url = self.node_url(&format!("/lxc/{ctid}/interfaces"));
        let http_resp = self
            .client
            .get(&url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox interfaces failed: {e}")))?;

        if !http_resp.status().is_success() {
            // Proxmox returns non-2xx (e.g. 500 "container not running") when
            // the CT is stopped — the JSON body is undecodable as interface data.
            let status = http_resp.status();
            let body = http_resp.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Container {ctid} is not running or has no network (HTTP {status}): {body}"
            )));
        }

        let resp: PveResponse<Vec<ContainerInterface>> = http_resp
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse interfaces: {e}")))?;

        // Find the first non-loopback interface with an IPv4 address.
        for iface in &resp.data {
            if iface.name == "lo" {
                continue;
            }
            if let Some(ref addr) = iface.ipv4 {
                // Proxmox returns "x.x.x.x/mask" — strip the mask.
                let ip = addr.split('/').next().unwrap_or(addr);
                return Ok(ip.to_string());
            }
        }

        Err(ApiError::internal(format!(
            "No IPv4 address found for container {ctid}"
        )))
    }

}

impl HttpProxmoxClient {
    /// Applies pending network configuration on the Proxmox node.
    ///
    /// This is required after creating or deleting a bridge: Proxmox writes the
    /// changes to `/etc/network/interfaces` and brings the interface up/down.
    async fn apply_network_config(&self) -> Result<(), ApiError> {
        let url = self.node_url("/network");
        let resp = self
            .client
            .put(&url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox network apply failed: {e}")))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Proxmox network apply error: {body}"
            )));
        }
        Ok(())
    }

    /// Polls the CT status until the Proxmox `lock` field is absent (i.e. the
    /// disk lock set during a full clone has been released) or `timeout_secs` elapses.
    async fn wait_for_unlock(&self, ctid: i32, timeout_secs: u64) -> Result<(), ApiError> {
        let deadline = tokio::time::Instant::now() + Duration::from_secs(timeout_secs);

        loop {
            let url = self.node_url(&format!("/lxc/{ctid}/status/current"));
            let resp = self
                .client
                .get(&url)
                .header(header::AUTHORIZATION, &self.auth_header)
                .send()
                .await;

            match resp {
                Ok(r) if r.status().is_success() => {
                    if let Ok(parsed) = r.json::<PveResponse<StatusData>>().await {
                        let locked = parsed.data.lock.as_deref().unwrap_or("").is_empty();
                        if locked {
                            return Ok(());
                        }
                        info!(ctid, lock = ?parsed.data.lock, "CT disk still locked, waiting");
                    }
                }
                _ => {}
            }

            if tokio::time::Instant::now() >= deadline {
                return Err(ApiError::internal(format!(
                    "CT {ctid} disk lock did not clear within {timeout_secs}s"
                )));
            }
            tokio::time::sleep(Duration::from_secs(3)).await;
        }
    }

    /// Polls the Proxmox task API until the task reports `stopped` with exitstatus
    /// `OK`, or until `timeout_secs` elapses. The UPID encodes the node name
    /// (second colon-delimited field), so no separate node parameter is needed.
    async fn wait_for_task(&self, upid: &str, timeout_secs: u64) -> Result<(), ApiError> {
        // UPID format: UPID:{node}:{pid}:{pstart}:{starttime}:{type}:{id}:{user}:
        let node = upid
            .split(':')
            .nth(1)
            .ok_or_else(|| ApiError::internal(format!("Cannot parse node from UPID: {upid}")))?;

        let url = format!(
            "{}/nodes/{}/tasks/{}/status",
            self.base_url,
            node,
            urlencoding::encode(upid)
        );
        let deadline = tokio::time::Instant::now() + Duration::from_secs(timeout_secs);

        loop {
            let resp = self
                .client
                .get(&url)
                .header(header::AUTHORIZATION, &self.auth_header)
                .send()
                .await;

            match resp {
                Ok(r) if r.status().is_success() => {
                    match r.json::<PveResponse<TaskStatus>>().await {
                        Ok(parsed) => {
                            info!(
                                upid,
                                task_status = %parsed.data.status,
                                exitstatus = ?parsed.data.exitstatus,
                                "task poll"
                            );
                            if parsed.data.status == "stopped" {
                                match parsed.data.exitstatus.as_deref() {
                                    Some("OK") => return Ok(()),
                                    Some(e) => {
                                        return Err(ApiError::internal(format!(
                                            "Proxmox task failed: {e}"
                                        )))
                                    }
                                    None => {
                                        return Err(ApiError::internal(
                                            "Proxmox task stopped with no exitstatus".to_string(),
                                        ))
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            info!(%e, "failed to parse task status response, retrying");
                        }
                    }
                }
                Ok(r) => {
                    let status = r.status();
                    info!(%status, "task status endpoint returned non-2xx, retrying");
                }
                Err(e) => {
                    info!(%e, "task status request error, retrying");
                }
            }

            if tokio::time::Instant::now() >= deadline {
                return Err(ApiError::internal(format!(
                    "Proxmox task {upid} did not complete within {timeout_secs}s"
                )));
            }
            tokio::time::sleep(Duration::from_secs(3)).await;
        }
    }
}
