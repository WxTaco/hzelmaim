//! Container persistence models and related API-facing DTOs.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Lifecycle state tracked by the control plane.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContainerState {
    Provisioning,
    Running,
    Stopped,
    Failed,
}

/// Access level a user holds on a container.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AccessLevel {
    Owner,
    Operator,
    Viewer,
}

/// Relationship between a user and a container.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerOwnership {
    pub container_id: Uuid,
    pub user_id: Uuid,
    pub access_level: AccessLevel,
    pub is_primary: bool,
}

/// Database-backed container record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerRecord {
    pub id: Uuid,
    pub proxmox_ctid: i32,
    pub name: String,
    pub node_name: String,
    /// Provisioned vCPU count, stored at creation time.
    pub cpu_cores: i16,
    /// Provisioned RAM in MiB, stored at creation time.
    pub memory_mb: i32,
    /// Provisioned disk in GiB, stored at creation time.
    pub disk_gb: i32,
    pub state: ContainerState,
    pub created_at: DateTime<Utc>,
}
