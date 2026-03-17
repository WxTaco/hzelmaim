//! Real Proxmox VE client backed by the REST API over HTTPS.

use async_trait::async_trait;
use reqwest::{Client, header};
use serde::Deserialize;
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

        let ssh_keys = request.ssh_public_keys.join("\n");
        let ssh_keys_encoded = urlencoding::encode(&ssh_keys);

        let mut params = vec![
            ("vmid".to_string(), vmid.to_string()),
            ("ostemplate".to_string(), request.template),
            ("hostname".to_string(), request.hostname),
            ("cores".to_string(), request.resource_limits.cpu_cores.to_string()),
            ("memory".to_string(), request.resource_limits.memory_mb.to_string()),
            ("rootfs".to_string(), format!("local-lvm:{}", request.resource_limits.disk_gb)),
            ("net0".to_string(), format!("name=eth0,bridge=vmbr0,ip=dhcp")),
            ("unprivileged".to_string(), "1".to_string()),
            ("features".to_string(), "nesting=1".to_string()),
            ("start".to_string(), "1".to_string()),
        ];

        if !ssh_keys.is_empty() {
            params.push(("ssh-public-keys".to_string(), ssh_keys_encoded.into_owned()));
        }

        let url = self.node_url("/lxc");
        let resp = self
            .client
            .post(&url)
            .header(header::AUTHORIZATION, &self.auth_header)
            .form(&params)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Proxmox create failed: {e}")))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!("Proxmox create error: {body}")));
        }

        info!(vmid, "proxmox container created");
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
}
