//! Personal access token repository trait and PostgreSQL implementation.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{db::Pool, models::api_token::ApiTokenRecord, utils::error::ApiError};

/// Persistence boundary for personal access tokens.
#[async_trait]
pub trait ApiTokenRepo: Send + Sync {
    /// Looks up a token by its SHA-256 hex digest.
    async fn find_by_hash(&self, hash: &str) -> Result<Option<ApiTokenRecord>, ApiError>;

    /// Persists a newly created token record.
    async fn create(&self, record: &ApiTokenRecord) -> Result<(), ApiError>;

    /// Marks a token as revoked. Only succeeds if the token belongs to `user_id`.
    async fn revoke(&self, token_id: Uuid, user_id: Uuid) -> Result<bool, ApiError>;

    /// Lists all tokens for a user (including revoked ones for auditing).
    async fn list_for_user(&self, user_id: Uuid) -> Result<Vec<ApiTokenRecord>, ApiError>;

    /// Updates the `last_used_at` timestamp for a token.
    async fn touch(&self, token_id: Uuid) -> Result<(), ApiError>;
}

/// sqlx row type for `api_tokens`.
#[derive(sqlx::FromRow)]
struct ApiTokenRow {
    id: Uuid,
    user_id: Uuid,
    name: String,
    token_hash: String,
    prefix: String,
    last_used_at: Option<DateTime<Utc>>,
    expires_at: Option<DateTime<Utc>>,
    created_at: DateTime<Utc>,
    revoked_at: Option<DateTime<Utc>>,
}

impl From<ApiTokenRow> for ApiTokenRecord {
    fn from(r: ApiTokenRow) -> Self {
        Self {
            id: r.id,
            user_id: r.user_id,
            name: r.name,
            token_hash: r.token_hash,
            prefix: r.prefix,
            last_used_at: r.last_used_at,
            expires_at: r.expires_at,
            created_at: r.created_at,
            revoked_at: r.revoked_at,
        }
    }
}

/// PostgreSQL implementation of the API token repository.
pub struct PgApiTokenRepo {
    pool: Pool,
}

impl PgApiTokenRepo {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ApiTokenRepo for PgApiTokenRepo {
    async fn find_by_hash(&self, hash: &str) -> Result<Option<ApiTokenRecord>, ApiError> {
        let row = sqlx::query_as::<_, ApiTokenRow>(
            "SELECT id, user_id, name, token_hash, prefix, last_used_at, expires_at, \
             created_at, revoked_at FROM api_tokens WHERE token_hash = $1",
        )
        .bind(hash)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        Ok(row.map(Into::into))
    }

    async fn create(&self, record: &ApiTokenRecord) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO api_tokens \
             (id, user_id, name, token_hash, prefix, expires_at, created_at) \
             VALUES ($1, $2, $3, $4, $5, $6, $7)",
        )
        .bind(record.id)
        .bind(record.user_id)
        .bind(&record.name)
        .bind(&record.token_hash)
        .bind(&record.prefix)
        .bind(record.expires_at)
        .bind(record.created_at)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn revoke(&self, token_id: Uuid, user_id: Uuid) -> Result<bool, ApiError> {
        let result = sqlx::query(
            "UPDATE api_tokens SET revoked_at = NOW() \
             WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL",
        )
        .bind(token_id)
        .bind(user_id)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        Ok(result.rows_affected() > 0)
    }

    async fn list_for_user(&self, user_id: Uuid) -> Result<Vec<ApiTokenRecord>, ApiError> {
        let rows = sqlx::query_as::<_, ApiTokenRow>(
            "SELECT id, user_id, name, token_hash, prefix, last_used_at, expires_at, \
             created_at, revoked_at FROM api_tokens WHERE user_id = $1 ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn touch(&self, token_id: Uuid) -> Result<(), ApiError> {
        sqlx::query("UPDATE api_tokens SET last_used_at = NOW() WHERE id = $1")
            .bind(token_id)
            .execute(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }
}

