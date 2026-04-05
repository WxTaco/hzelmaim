//! Data models for the webhook auto-deployment feature.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Lifecycle status of a webhook delivery.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum DeliveryStatus {
    Pending,
    Running,
    Succeeded,
    Failed,
    Skipped,
}

impl DeliveryStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            DeliveryStatus::Pending => "pending",
            DeliveryStatus::Running => "running",
            DeliveryStatus::Succeeded => "succeeded",
            DeliveryStatus::Failed => "failed",
            DeliveryStatus::Skipped => "skipped",
        }
    }
}

impl std::str::FromStr for DeliveryStatus {
    type Err = ();
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(DeliveryStatus::Pending),
            "running" => Ok(DeliveryStatus::Running),
            "succeeded" => Ok(DeliveryStatus::Succeeded),
            "failed" => Ok(DeliveryStatus::Failed),
            "skipped" => Ok(DeliveryStatus::Skipped),
            _ => Err(()),
        }
    }
}

/// Persisted webhook configuration for a container.
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct WebhookConfig {
    pub id: Uuid,
    pub container_id: Uuid,
    pub provider: String,
    /// Plaintext secret — required for HMAC-SHA256 re-computation.
    pub webhook_secret: String,
    /// Short branch name (e.g. "main") — deploy only on matching pushes.
    pub branch: String,
    /// Absolute path inside the container to cd into before the command.
    pub working_dir: String,
    /// Verbatim shell command sent to TerminalService::exec_command.
    pub post_pull_cmd: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Persisted delivery record for one inbound webhook call.
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct WebhookDelivery {
    pub id: Uuid,
    pub webhook_id: Uuid,
    /// Provider-assigned delivery UUID (e.g. X-GitHub-Delivery).
    pub delivery_id: String,
    pub provider: String,
    pub event_type: String,
    pub branch: String,
    pub head_commit_id: String,
    pub status: DeliveryStatus,
    pub error_message: Option<String>,
    pub received_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// Request body for creating a new webhook configuration.
#[derive(Debug, Clone, Deserialize, utoipa::ToSchema)]
pub struct CreateWebhookConfigRequest {
    pub provider: String,
    pub webhook_secret: String,
    pub branch: String,
    pub working_dir: String,
    pub post_pull_cmd: String,
}

/// Request body for updating an existing webhook configuration.
/// At least one field must be Some.
#[derive(Debug, Clone, Deserialize, utoipa::ToSchema)]
pub struct UpdateWebhookConfigRequest {
    pub provider: Option<String>,
    pub webhook_secret: Option<String>,
    pub branch: Option<String>,
    pub working_dir: Option<String>,
    pub post_pull_cmd: Option<String>,
}
