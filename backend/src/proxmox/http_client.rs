//! Real Proxmox VE client backed by the REST API over HTTPS.

use async_trait::async_trait;
use reqwest::{Client, header};
use serde::Deserialize;
use tokio::time::{Duration, sleep};
use tracing::info;

use crate::{
    config::AppConfig,
    models::command::CommandExecutionRecord,
    proxmox::{
        client::ProxmoxClient,
        types::{ContainerInterface, ContainerMetrics, ContainerRuntimeStatus, CreateContainerRequest},
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
                header::HeaderValue::from_str(&config.cf_access_client_secret)
                    .map_err(|e| ApiError::internal(format!("Invalid CF_ACCESS_CLIENT_SECRET: {e}")))?,
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
            return Err(ApiError::internal(format!("Proxmox {action} error: {body}")));
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

        // Clone from the template container.
        let params = vec![
            ("newid".to_string(), vmid.to_string()),
            ("hostname".to_string(), request.hostname),
            ("full".to_string(), "1".to_string()),
        ];

        // Apply resource limits after clone via a config update.
        let clone_url = self.node_url(&format!("/lxc/{}/clone", request.template_ctid));
        let resp = self
            .client
            .post(&clone_url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .form(&params)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox clone failed: {e}")))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!("Proxmox clone error: {body}")));
        }

        // Wait for the clone task to finish by polling the container config.
        self.wait_for_container(vmid, 60).await?;

        // Apply CPU, memory, and network config to the cloned container.
        let config_params = vec![
            ("cores".to_string(), request.resource_limits.cpu_cores.to_string()),
            ("memory".to_string(), request.resource_limits.memory_mb.to_string()),
            ("net0".to_string(), "name=eth0,bridge=vmbr0,ip=dhcp".to_string()),
        ];

        let config_url = self.node_url(&format!("/lxc/{vmid}/config"));
        let config_resp = self
            .client
            .put(&config_url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .form(&config_params)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox config update failed: {e}")))?;

        if !config_resp.status().is_success() {
            let body = config_resp.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!("Proxmox config update error: {body}")));
        }

        // Proxmox locks the CT disk briefly after cloning — wait for the lock to clear.
        sleep(Duration::from_secs(30)).await;

        // Resize the rootfs disk to the requested size via the dedicated resize API.
        // Setting rootfs via PUT /config on an already-cloned disk is not supported by Proxmox.
        let resize_params = vec![
            ("disk".to_string(), "rootfs".to_string()),
            ("size".to_string(), format!("{}G", request.resource_limits.disk_gb)),
        ];

        let resize_url = self.node_url(&format!("/lxc/{vmid}/resize"));
        let resize_resp = self
            .client
            .put(&resize_url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .form(&resize_params)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox disk resize failed: {e}")))?;

        if !resize_resp.status().is_success() {
            let body = resize_resp.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!("Proxmox disk resize error: {body}")));
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

    async fn exec_command(&self, _ctid: i32, _command: &CommandExecutionRecord) -> Result<(), ApiError> {
        // pct exec is not exposed via REST API — will use SSH instead.
        Err(ApiError::not_implemented("exec via Proxmox API is not supported; use SSH"))
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
            return Err(ApiError::internal(format!("Proxmox snapshot error: {body}")));
        }
        Ok(())
    }

    async fn get_container_ip(&self, ctid: i32) -> Result<String, ApiError> {
        let url = self.node_url(&format!("/lxc/{ctid}/interfaces"));
        let resp: PveResponse<Vec<ContainerInterface>> = self
            .client
            .get(&url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox interfaces failed: {e}")))?
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

        Err(ApiError::internal(format!("No IPv4 address found for container {ctid}")))
    }

    async fn set_container_password(&self, ctid: i32, password: &str) -> Result<(), ApiError> {
        let url = self.node_url(&format!("/lxc/{ctid}/config"));
        let resp = self
            .client
            .put(&url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .form(&[("password", password)])
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox set password failed: {e}")))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!("Proxmox set password error: {body}")));
        }

        info!(ctid, "container root password set");
        Ok(())
    }
}


impl HttpProxmoxClient {
    /// Polls until the container config is available (i.e. the clone task has
    /// finished) or `timeout_secs` elapses.
    async fn wait_for_container(&self, ctid: i32, timeout_secs: u64) -> Result<(), ApiError> {
        let deadline = tokio::time::Instant::now()
            + std::time::Duration::from_secs(timeout_secs);

        loop {
            let url = self.node_url(&format!("/lxc/{ctid}/config"));
            let resp = self
                .client
                .get(&url)
                .header(header::AUTHORIZATION, &self.auth_header)
                .send()
                .await;

            match resp {
                Ok(r) if r.status().is_success() => return Ok(()),
                _ if tokio::time::Instant::now() < deadline => {
                    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                }
                _ => {
                    return Err(ApiError::internal(format!(
                        "Container {ctid} not ready within {timeout_secs}s after clone"
                    )));
                }
            }
        }
    }
}