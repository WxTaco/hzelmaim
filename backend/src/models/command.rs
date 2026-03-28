//! Command definition and execution record models.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Reusable command templates defined by platform operators or users.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandDefinitionRecord {
    pub id: Uuid,
    pub owner_user_id: Uuid,
    pub name: String,
    pub program: String,
    pub args: Vec<String>,
    pub created_at: DateTime<Utc>,
}

/// Execution status for queued container commands.
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum CommandExecutionStatus {
    Queued,
    Running,
    Succeeded,
    Failed,
    Cancelled,
}

/// Immutable execution record used by APIs and audit trails.
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct CommandExecutionRecord {
    pub id: Uuid,
    pub container_id: Uuid,
    pub requested_by: Uuid,
    pub program: String,
    pub args: Vec<String>,
    pub status: CommandExecutionStatus,
    pub stdout: String,
    pub stderr: String,
    pub created_at: DateTime<Utc>,
}
