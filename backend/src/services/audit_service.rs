//! Audit logging service backed by the audit repository.

use std::sync::Arc;

use chrono::Utc;
use serde_json::json;
use tracing::{error, info};
use uuid::Uuid;

use crate::db::audit_repo::AuditRepo;
use crate::models::audit::AuditLogRecord;

/// Emits structured audit log events and persists them to the database.
pub struct AuditService {
    repo: Arc<dyn AuditRepo>,
}

impl AuditService {
    /// Creates a new audit service with a repository backend.
    pub fn new(repo: Arc<dyn AuditRepo>) -> Self {
        Self { repo }
    }

    /// Records a successful security-sensitive event.
    pub async fn log_success(&self, user_id: Option<Uuid>, container_id: Option<Uuid>, action: &str) {
        info!(user_id = ?user_id, container_id = ?container_id, action, outcome = "success", "audit event");
        let record = AuditLogRecord {
            id: Uuid::new_v4(),
            user_id,
            container_id,
            action: action.to_string(),
            outcome: "success".to_string(),
            metadata: json!({}),
            created_at: Utc::now(),
        };
        if let Err(e) = self.repo.insert(&record).await {
            error!("Failed to persist audit log: {e:?}");
        }
    }

    /// Records a failed security-sensitive event.
    pub async fn log_failure(&self, user_id: Option<Uuid>, container_id: Option<Uuid>, action: &str, reason: &str) {
        error!(user_id = ?user_id, container_id = ?container_id, action, outcome = "failure", reason, "audit event");
        let record = AuditLogRecord {
            id: Uuid::new_v4(),
            user_id,
            container_id,
            action: action.to_string(),
            outcome: "failure".to_string(),
            metadata: json!({ "reason": reason }),
            created_at: Utc::now(),
        };
        if let Err(e) = self.repo.insert(&record).await {
            error!("Failed to persist audit log: {e:?}");
        }
    }
}
