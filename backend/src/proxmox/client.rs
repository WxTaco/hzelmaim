//! Abstractions for all Proxmox interactions.

use async_trait::async_trait;

use crate::{
    models::command::CommandExecutionRecord,
    proxmox::types::{ContainerMetrics, ContainerRuntimeStatus, CreateContainerRequest},
    utils::error::ApiError,
};

/// Single integration point for Proxmox VE actions.
#[async_trait]
pub trait ProxmoxClient: Send + Sync {
    async fn create_container(&self, request: CreateContainerRequest) -> Result<i32, ApiError>;
    async fn start_container(&self, ctid: i32) -> Result<(), ApiError>;
    async fn stop_container(&self, ctid: i32) -> Result<(), ApiError>;
    async fn restart_container(&self, ctid: i32) -> Result<(), ApiError>;
    async fn exec_command(
        &self,
        ctid: i32,
        command: &CommandExecutionRecord,
    ) -> Result<(), ApiError>;
    async fn container_status(&self, ctid: i32) -> Result<ContainerRuntimeStatus, ApiError>;
    async fn container_metrics(&self, ctid: i32) -> Result<ContainerMetrics, ApiError>;
    async fn create_snapshot(&self, ctid: i32, name: &str) -> Result<(), ApiError>;
    /// Returns the first non-loopback IPv4 address for the container.
    async fn get_container_ip(&self, ctid: i32) -> Result<String, ApiError>;

    // --- Private networking (Option A: Linux bridge) ----------------------

    /// Creates a Linux bridge (`vmbrN`) on the Proxmox node and applies the
    /// network configuration so the bridge is immediately available.
    async fn create_bridge(&self, bridge_id: i32) -> Result<(), ApiError>;

    /// Removes a Linux bridge from the Proxmox node and applies the change.
    /// The bridge must have no active container NICs attached before calling this.
    async fn delete_bridge(&self, bridge_name: &str) -> Result<(), ApiError>;

    /// Attaches a second (or higher) NIC to an LXC container and assigns it a
    /// static IP on the given bridge.
    ///
    /// * `net_index` — the Proxmox `netN` slot to use (1–15; 0 is `eth0`/public)
    /// * `bridge`    — the bridge device name, e.g. `"vmbr105"`
    /// * `ip`        — host address without prefix, e.g. `"10.42.0.3"`
    /// * `prefix_len`— network prefix length, e.g. `24`
    async fn attach_container_nic(
        &self,
        ctid: i32,
        net_index: u8,
        bridge: &str,
        ip: &str,
        prefix_len: u8,
    ) -> Result<(), ApiError>;

    /// Removes the `netN` NIC from an LXC container's Proxmox configuration.
    async fn detach_container_nic(&self, ctid: i32, net_index: u8) -> Result<(), ApiError>;
}

/// Safe placeholder client that forces production integrations through this module.
pub struct StubProxmoxClient;

impl StubProxmoxClient {
    /// Creates a new stub integration.
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl ProxmoxClient for StubProxmoxClient {
    async fn create_container(&self, _request: CreateContainerRequest) -> Result<i32, ApiError> {
        Err(ApiError::not_implemented(
            "Proxmox provisioning is not wired yet",
        ))
    }
    async fn start_container(&self, _ctid: i32) -> Result<(), ApiError> {
        Err(ApiError::not_implemented("Start action is not wired yet"))
    }
    async fn stop_container(&self, _ctid: i32) -> Result<(), ApiError> {
        Err(ApiError::not_implemented("Stop action is not wired yet"))
    }
    async fn restart_container(&self, _ctid: i32) -> Result<(), ApiError> {
        Err(ApiError::not_implemented("Restart action is not wired yet"))
    }
    async fn exec_command(
        &self,
        _ctid: i32,
        _command: &CommandExecutionRecord,
    ) -> Result<(), ApiError> {
        Err(ApiError::not_implemented(
            "pct exec integration is not wired yet",
        ))
    }
    async fn container_status(&self, _ctid: i32) -> Result<ContainerRuntimeStatus, ApiError> {
        Ok(ContainerRuntimeStatus::Unknown)
    }
    async fn container_metrics(&self, _ctid: i32) -> Result<ContainerMetrics, ApiError> {
        Err(ApiError::not_implemented(
            "Metrics collection is not wired yet",
        ))
    }
    async fn create_snapshot(&self, _ctid: i32, _name: &str) -> Result<(), ApiError> {
        Err(ApiError::not_implemented(
            "Snapshot management is not wired yet",
        ))
    }
    async fn get_container_ip(&self, _ctid: i32) -> Result<String, ApiError> {
        Err(ApiError::not_implemented("IP lookup is not wired yet"))
    }

    async fn create_bridge(&self, _bridge_id: i32) -> Result<(), ApiError> {
        Err(ApiError::not_implemented("Bridge creation is not wired yet"))
    }

    async fn delete_bridge(&self, _bridge_name: &str) -> Result<(), ApiError> {
        Err(ApiError::not_implemented("Bridge deletion is not wired yet"))
    }

    async fn attach_container_nic(
        &self,
        _ctid: i32,
        _net_index: u8,
        _bridge: &str,
        _ip: &str,
        _prefix_len: u8,
    ) -> Result<(), ApiError> {
        Err(ApiError::not_implemented("NIC attach is not wired yet"))
    }

    async fn detach_container_nic(&self, _ctid: i32, _net_index: u8) -> Result<(), ApiError> {
        Err(ApiError::not_implemented("NIC detach is not wired yet"))
    }
}
