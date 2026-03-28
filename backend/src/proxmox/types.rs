//! Typed requests and responses exchanged with the Proxmox integration layer.

use serde::{Deserialize, Serialize};

/// Container resource limits enforced during creation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceLimits {
    pub cpu_cores: u8,
    pub memory_mb: u32,
    pub disk_gb: u32,
}

/// Request payload for creating a secure unprivileged LXC container.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateContainerRequest {
    pub node_name: String,
    pub hostname: String,
    /// Proxmox CT ID of the template container to clone from (e.g. 1000).
    pub template_ctid: i32,
    pub resource_limits: ResourceLimits,
    /// SSH public keys injected into the container at creation (OpenSSH format).
    #[serde(default)]
    pub ssh_public_keys: Vec<String>,
}

/// A network interface returned by the Proxmox interfaces API.
#[derive(Debug, Clone, Deserialize)]
pub struct ContainerInterface {
    pub name: String,
    #[serde(rename = "inet")]
    pub ipv4: Option<String>,
    #[serde(rename = "inet6")]
    pub ipv6: Option<String>,
    #[serde(rename = "hwaddr")]
    pub mac_address: Option<String>,
}

/// Runtime status returned from Proxmox.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContainerRuntimeStatus {
    Running,
    Stopped,
    Unknown,
}

/// Point-in-time container metrics surfaced to the dashboard.
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ContainerMetrics {
    pub cpu_percent: f32,
    pub memory_used_mb: u32,
    pub memory_limit_mb: u32,
    pub network_rx_bytes: u64,
    pub network_tx_bytes: u64,
}
