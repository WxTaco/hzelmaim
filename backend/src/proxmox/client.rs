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
}
