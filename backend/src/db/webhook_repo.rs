//! PostgreSQL-backed webhook configuration and delivery persistence.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    db::Pool,
    models::webhook::{
        DeliveryStatus, UpdateWebhookConfigRequest, WebhookConfig,
        WebhookDelivery,
    },
    utils::error::ApiError,
};

/// Persistence boundary for webhook configurations and delivery records.
#[async_trait]
pub trait WebhookRepo: Send + Sync {
    async fn create_config(&self, cfg: &WebhookConfig) -> Result<(), ApiError>;
    async fn list_configs(&self, container_id: Uuid) -> Result<Vec<WebhookConfig>, ApiError>;
    async fn get_config(&self, webhook_id: Uuid) -> Result<Option<WebhookConfig>, ApiError>;
    async fn update_config(
        &self,
        webhook_id: Uuid,
        req: &UpdateWebhookConfigRequest,
    ) -> Result<(), ApiError>;
    async fn delete_config(&self, webhook_id: Uuid) -> Result<(), ApiError>;

    async fn create_delivery(&self, d: &WebhookDelivery) -> Result<(), ApiError>;
    async fn update_delivery_status(
        &self,
        delivery_row_id: Uuid,
        status: DeliveryStatus,
        error_message: Option<&str>,
        completed_at: Option<DateTime<Utc>>,
    ) -> Result<(), ApiError>;
    async fn list_deliveries(
        &self,
        webhook_id: Uuid,
        limit: i64,
    ) -> Result<Vec<WebhookDelivery>, ApiError>;
}

/// PostgreSQL implementation of the webhook repository.
pub struct PgWebhookRepo {
    pool: Pool,
}

impl PgWebhookRepo {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

// ---------------------------------------------------------------------------
// sqlx row helpers
// ---------------------------------------------------------------------------

#[derive(sqlx::FromRow)]
struct WebhookConfigRow {
    id: Uuid,
    container_id: Uuid,
    provider: String,
    webhook_secret: String,
    branch: String,
    working_dir: String,
    post_pull_cmd: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl From<WebhookConfigRow> for WebhookConfig {
    fn from(r: WebhookConfigRow) -> Self {
        Self {
            id: r.id,
            container_id: r.container_id,
            provider: r.provider,
            webhook_secret: r.webhook_secret,
            branch: r.branch,
            working_dir: r.working_dir,
            post_pull_cmd: r.post_pull_cmd,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}

#[derive(sqlx::FromRow)]
struct WebhookDeliveryRow {
    id: Uuid,
    webhook_id: Uuid,
    delivery_id: String,
    provider: String,
    event_type: String,
    branch: String,
    head_commit_id: String,
    status: String,
    error_message: Option<String>,
    received_at: DateTime<Utc>,
    completed_at: Option<DateTime<Utc>>,
}

impl From<WebhookDeliveryRow> for WebhookDelivery {
    fn from(r: WebhookDeliveryRow) -> Self {
        Self {
            id: r.id,
            webhook_id: r.webhook_id,
            delivery_id: r.delivery_id,
            provider: r.provider,
            event_type: r.event_type,
            branch: r.branch,
            head_commit_id: r.head_commit_id,
            status: r.status.parse().unwrap_or(DeliveryStatus::Failed),
            error_message: r.error_message,
            received_at: r.received_at,
            completed_at: r.completed_at,
        }
    }
}

// ---------------------------------------------------------------------------
// PgWebhookRepo implementation
// ---------------------------------------------------------------------------

#[async_trait]
impl WebhookRepo for PgWebhookRepo {
    async fn create_config(&self, cfg: &WebhookConfig) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO webhook_configs \
             (id, container_id, provider, webhook_secret, branch, working_dir, post_pull_cmd, created_at, updated_at) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        )
        .bind(cfg.id)
        .bind(cfg.container_id)
        .bind(&cfg.provider)
        .bind(&cfg.webhook_secret)
        .bind(&cfg.branch)
        .bind(&cfg.working_dir)
        .bind(&cfg.post_pull_cmd)
        .bind(cfg.created_at)
        .bind(cfg.updated_at)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn list_configs(&self, container_id: Uuid) -> Result<Vec<WebhookConfig>, ApiError> {
        let rows = sqlx::query_as::<_, WebhookConfigRow>(
            "SELECT id, container_id, provider, webhook_secret, branch, working_dir, post_pull_cmd, created_at, updated_at \
             FROM webhook_configs WHERE container_id = $1 ORDER BY created_at DESC",
        )
        .bind(container_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn get_config(&self, webhook_id: Uuid) -> Result<Option<WebhookConfig>, ApiError> {
        let row = sqlx::query_as::<_, WebhookConfigRow>(
            "SELECT id, container_id, provider, webhook_secret, branch, working_dir, post_pull_cmd, created_at, updated_at \
             FROM webhook_configs WHERE id = $1",
        )
        .bind(webhook_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.map(Into::into))
    }

    async fn update_config(
        &self,
        webhook_id: Uuid,
        req: &UpdateWebhookConfigRequest,
    ) -> Result<(), ApiError> {
        // Build a dynamic UPDATE statement only for provided fields.
        let mut sets: Vec<String> = Vec::new();
        let mut idx: i32 = 1;

        if req.provider.is_some() { sets.push(format!("provider = ${idx}")); idx += 1; }
        if req.webhook_secret.is_some() { sets.push(format!("webhook_secret = ${idx}")); idx += 1; }
        if req.branch.is_some() { sets.push(format!("branch = ${idx}")); idx += 1; }
        if req.working_dir.is_some() { sets.push(format!("working_dir = ${idx}")); idx += 1; }
        if req.post_pull_cmd.is_some() { sets.push(format!("post_pull_cmd = ${idx}")); idx += 1; }
        sets.push(format!("updated_at = ${idx}"));
        idx += 1;

        let sql = format!(
            "UPDATE webhook_configs SET {} WHERE id = ${}",
            sets.join(", "),
            idx
        );

        let mut q = sqlx::query(&sql);
        if let Some(v) = &req.provider { q = q.bind(v); }
        if let Some(v) = &req.webhook_secret { q = q.bind(v); }
        if let Some(v) = &req.branch { q = q.bind(v); }
        if let Some(v) = &req.working_dir { q = q.bind(v); }
        if let Some(v) = &req.post_pull_cmd { q = q.bind(v); }
        q = q.bind(Utc::now());
        q = q.bind(webhook_id);

        q.execute(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn delete_config(&self, webhook_id: Uuid) -> Result<(), ApiError> {
        sqlx::query("DELETE FROM webhook_configs WHERE id = $1")
            .bind(webhook_id)
            .execute(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn create_delivery(&self, d: &WebhookDelivery) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO webhook_deliveries \
             (id, webhook_id, delivery_id, provider, event_type, branch, head_commit_id, status, error_message, received_at, completed_at) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        )
        .bind(d.id)
        .bind(d.webhook_id)
        .bind(&d.delivery_id)
        .bind(&d.provider)
        .bind(&d.event_type)
        .bind(&d.branch)
        .bind(&d.head_commit_id)
        .bind(d.status.as_str())
        .bind(&d.error_message)
        .bind(d.received_at)
        .bind(d.completed_at)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn update_delivery_status(
        &self,
        delivery_row_id: Uuid,
        status: DeliveryStatus,
        error_message: Option<&str>,
        completed_at: Option<DateTime<Utc>>,
    ) -> Result<(), ApiError> {
        sqlx::query(
            "UPDATE webhook_deliveries SET status = $1, error_message = $2, completed_at = $3 WHERE id = $4",
        )
        .bind(status.as_str())
        .bind(error_message)
        .bind(completed_at)
        .bind(delivery_row_id)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn list_deliveries(
        &self,
        webhook_id: Uuid,
        limit: i64,
    ) -> Result<Vec<WebhookDelivery>, ApiError> {
        let rows = sqlx::query_as::<_, WebhookDeliveryRow>(
            "SELECT id, webhook_id, delivery_id, provider, event_type, branch, head_commit_id, \
             status, error_message, received_at, completed_at \
             FROM webhook_deliveries WHERE webhook_id = $1 \
             ORDER BY received_at DESC LIMIT $2",
        )
        .bind(webhook_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(rows.into_iter().map(Into::into).collect())
    }
}
