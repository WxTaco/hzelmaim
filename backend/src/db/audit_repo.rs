//! PostgreSQL-backed audit log persistence.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    db::Pool,
    models::audit::AuditLogRecord,
    utils::error::ApiError,
};

/// Persistence boundary for audit log operations.
#[async_trait]
pub trait AuditRepo: Send + Sync {
    /// Inserts a new audit log entry.
    async fn insert(&self, record: &AuditLogRecord) -> Result<(), ApiError>;

    /// Lists recent audit entries with optional user filter. Paginated by limit/offset.
    async fn list(&self, user_id: Option<Uuid>, limit: i64, offset: i64) -> Result<Vec<AuditLogRecord>, ApiError>;
}

/// PostgreSQL implementation of the audit repository.
pub struct PgAuditRepo {
    pool: Pool,
}

impl PgAuditRepo {
    /// Creates a new PostgreSQL audit repository.
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

#[derive(sqlx::FromRow)]
struct AuditRow {
    id: Uuid,
    user_id: Option<Uuid>,
    container_id: Option<Uuid>,
    action: String,
    outcome: String,
    metadata: serde_json::Value,
    created_at: DateTime<Utc>,
}

impl From<AuditRow> for AuditLogRecord {
    fn from(row: AuditRow) -> Self {
        Self {
            id: row.id,
            user_id: row.user_id,
            container_id: row.container_id,
            action: row.action,
            outcome: row.outcome,
            metadata: row.metadata,
            created_at: row.created_at,
        }
    }
}

#[async_trait]
impl AuditRepo for PgAuditRepo {
    async fn insert(&self, record: &AuditLogRecord) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO audit_logs (id, user_id, container_id, action, outcome, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        )
        .bind(record.id)
        .bind(record.user_id)
        .bind(record.container_id)
        .bind(&record.action)
        .bind(&record.outcome)
        .bind(&record.metadata)
        .bind(record.created_at)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn list(&self, user_id: Option<Uuid>, limit: i64, offset: i64) -> Result<Vec<AuditLogRecord>, ApiError> {
        let rows = sqlx::query_as::<_, AuditRow>(
            r#"SELECT id, user_id, container_id, action, outcome, metadata, created_at
               FROM audit_logs
               WHERE ($1::uuid IS NULL OR user_id = $1)
               ORDER BY created_at DESC
               LIMIT $2 OFFSET $3"#,
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(rows.into_iter().map(Into::into).collect())
    }
}

