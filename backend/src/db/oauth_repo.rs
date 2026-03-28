//! OAuth 2.0 repository traits and PostgreSQL implementations.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    db::Pool,
    models::oauth::{OAuthApplication, OAuthAuthorizationCode, OAuthRefreshToken},
    utils::error::ApiError,
};

// ── OAuthAppRepo ─────────────────────────────────────────────────────────────

/// Persistence boundary for OAuth application registrations.
#[async_trait]
pub trait OAuthAppRepo: Send + Sync {
    async fn create(&self, app: &OAuthApplication) -> Result<(), ApiError>;
    async fn get(&self, app_id: Uuid) -> Result<Option<OAuthApplication>, ApiError>;
    async fn find_by_client_id(&self, client_id: Uuid) -> Result<Option<OAuthApplication>, ApiError>;
    async fn list_for_user(&self, user_id: Uuid) -> Result<Vec<OAuthApplication>, ApiError>;
    async fn update(
        &self,
        app_id: Uuid,
        name: &str,
        description: Option<&str>,
        redirect_uris: &[String],
    ) -> Result<(), ApiError>;
    async fn rotate_secret(
        &self,
        app_id: Uuid,
        secret_hash: &str,
        secret_prefix: &str,
    ) -> Result<(), ApiError>;
    /// Soft-deletes the application and revokes all of its refresh tokens.
    async fn revoke(&self, app_id: Uuid) -> Result<(), ApiError>;
}

// ── OAuthCodeRepo ─────────────────────────────────────────────────────────────

/// Persistence boundary for short-lived OAuth authorization codes.
#[async_trait]
pub trait OAuthCodeRepo: Send + Sync {
    async fn create(&self, code: &OAuthAuthorizationCode) -> Result<(), ApiError>;
    /// Atomically marks the code as used and returns it.
    /// Returns `None` if the code does not exist, is already used, or is expired.
    async fn consume(&self, code_hash: &str) -> Result<Option<OAuthAuthorizationCode>, ApiError>;
}

// ── OAuthTokenRepo ────────────────────────────────────────────────────────────

/// Persistence boundary for long-lived OAuth refresh tokens.
#[async_trait]
pub trait OAuthTokenRepo: Send + Sync {
    async fn create(&self, token: &OAuthRefreshToken) -> Result<(), ApiError>;
    async fn find_by_hash(&self, hash: &str) -> Result<Option<OAuthRefreshToken>, ApiError>;
    async fn revoke(&self, token_id: Uuid) -> Result<(), ApiError>;
    async fn revoke_all_for_app(&self, app_id: Uuid) -> Result<(), ApiError>;
    async fn touch(&self, token_id: Uuid) -> Result<(), ApiError>;
}

// ── sqlx row types ────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct AppRow {
    id: Uuid,
    owner_user_id: Uuid,
    name: String,
    description: Option<String>,
    client_id: Uuid,
    client_secret_hash: String,
    client_secret_prefix: String,
    redirect_uris: Vec<String>,
    created_at: DateTime<Utc>,
    revoked_at: Option<DateTime<Utc>>,
}

impl From<AppRow> for OAuthApplication {
    fn from(r: AppRow) -> Self {
        Self {
            id: r.id,
            owner_user_id: r.owner_user_id,
            name: r.name,
            description: r.description,
            client_id: r.client_id,
            client_secret_hash: r.client_secret_hash,
            client_secret_prefix: r.client_secret_prefix,
            redirect_uris: r.redirect_uris,
            created_at: r.created_at,
            revoked_at: r.revoked_at,
        }
    }
}

#[derive(sqlx::FromRow)]
struct CodeRow {
    id: Uuid,
    app_id: Uuid,
    user_id: Uuid,
    code_hash: String,
    redirect_uri: String,
    expires_at: DateTime<Utc>,
    used_at: Option<DateTime<Utc>>,
}

impl From<CodeRow> for OAuthAuthorizationCode {
    fn from(r: CodeRow) -> Self {
        Self {
            id: r.id,
            app_id: r.app_id,
            user_id: r.user_id,
            code_hash: r.code_hash,
            redirect_uri: r.redirect_uri,
            expires_at: r.expires_at,
            used_at: r.used_at,
        }
    }
}

#[derive(sqlx::FromRow)]
struct TokenRow {
    id: Uuid,
    app_id: Uuid,
    user_id: Uuid,
    token_hash: String,
    created_at: DateTime<Utc>,
    last_used_at: Option<DateTime<Utc>>,
    revoked_at: Option<DateTime<Utc>>,
}

impl From<TokenRow> for OAuthRefreshToken {
    fn from(r: TokenRow) -> Self {
        Self {
            id: r.id,
            app_id: r.app_id,
            user_id: r.user_id,
            token_hash: r.token_hash,
            created_at: r.created_at,
            last_used_at: r.last_used_at,
            revoked_at: r.revoked_at,
        }
    }
}

// ── PgOAuthAppRepo ────────────────────────────────────────────────────────────

pub struct PgOAuthAppRepo {
    pool: Pool,
}

impl PgOAuthAppRepo {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

const APP_COLS: &str =
    "id, owner_user_id, name, description, client_id, client_secret_hash, \
     client_secret_prefix, redirect_uris, created_at, revoked_at";

#[async_trait]
impl OAuthAppRepo for PgOAuthAppRepo {
    async fn create(&self, app: &OAuthApplication) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO oauth_applications \
             (id, owner_user_id, name, description, client_id, client_secret_hash, \
              client_secret_prefix, redirect_uris, created_at) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        )
        .bind(app.id)
        .bind(app.owner_user_id)
        .bind(&app.name)
        .bind(&app.description)
        .bind(app.client_id)
        .bind(&app.client_secret_hash)
        .bind(&app.client_secret_prefix)
        .bind(&app.redirect_uris)
        .bind(app.created_at)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn get(&self, app_id: Uuid) -> Result<Option<OAuthApplication>, ApiError> {
        let row = sqlx::query_as::<_, AppRow>(
            &format!("SELECT {APP_COLS} FROM oauth_applications WHERE id = $1"),
        )
        .bind(app_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.map(Into::into))
    }

    async fn find_by_client_id(
        &self,
        client_id: Uuid,
    ) -> Result<Option<OAuthApplication>, ApiError> {
        let row = sqlx::query_as::<_, AppRow>(
            &format!("SELECT {APP_COLS} FROM oauth_applications WHERE client_id = $1"),
        )
        .bind(client_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.map(Into::into))
    }

    async fn list_for_user(&self, user_id: Uuid) -> Result<Vec<OAuthApplication>, ApiError> {
        let rows = sqlx::query_as::<_, AppRow>(&format!(
            "SELECT {APP_COLS} FROM oauth_applications \
             WHERE owner_user_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC",
        ))
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn update(
        &self,
        app_id: Uuid,
        name: &str,
        description: Option<&str>,
        redirect_uris: &[String],
    ) -> Result<(), ApiError> {
        sqlx::query(
            "UPDATE oauth_applications \
             SET name = $1, description = $2, redirect_uris = $3 \
             WHERE id = $4 AND revoked_at IS NULL",
        )
        .bind(name)
        .bind(description)
        .bind(redirect_uris)
        .bind(app_id)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn rotate_secret(
        &self,
        app_id: Uuid,
        secret_hash: &str,
        secret_prefix: &str,
    ) -> Result<(), ApiError> {
        sqlx::query(
            "UPDATE oauth_applications \
             SET client_secret_hash = $1, client_secret_prefix = $2 \
             WHERE id = $3 AND revoked_at IS NULL",
        )
        .bind(secret_hash)
        .bind(secret_prefix)
        .bind(app_id)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn revoke(&self, app_id: Uuid) -> Result<(), ApiError> {
        // Revoke all refresh tokens for this app first, then soft-delete the app.
        sqlx::query(
            "UPDATE oauth_refresh_tokens SET revoked_at = NOW() \
             WHERE app_id = $1 AND revoked_at IS NULL",
        )
        .bind(app_id)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        sqlx::query("UPDATE oauth_applications SET revoked_at = NOW() WHERE id = $1")
            .bind(app_id)
            .execute(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }
}

// ── PgOAuthCodeRepo ───────────────────────────────────────────────────────────

pub struct PgOAuthCodeRepo {
    pool: Pool,
}

impl PgOAuthCodeRepo {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl OAuthCodeRepo for PgOAuthCodeRepo {
    async fn create(&self, code: &OAuthAuthorizationCode) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO oauth_authorization_codes \
             (id, app_id, user_id, code_hash, redirect_uri, expires_at) \
             VALUES ($1, $2, $3, $4, $5, $6)",
        )
        .bind(code.id)
        .bind(code.app_id)
        .bind(code.user_id)
        .bind(&code.code_hash)
        .bind(&code.redirect_uri)
        .bind(code.expires_at)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn consume(
        &self,
        code_hash: &str,
    ) -> Result<Option<OAuthAuthorizationCode>, ApiError> {
        // Atomically mark the code as used and return it in one round-trip.
        // Rejects already-used or expired codes.
        let row = sqlx::query_as::<_, CodeRow>(
            "UPDATE oauth_authorization_codes SET used_at = NOW() \
             WHERE code_hash = $1 AND used_at IS NULL AND expires_at > NOW() \
             RETURNING id, app_id, user_id, code_hash, redirect_uri, expires_at, used_at",
        )
        .bind(code_hash)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.map(Into::into))
    }
}

// ── PgOAuthTokenRepo ──────────────────────────────────────────────────────────

pub struct PgOAuthTokenRepo {
    pool: Pool,
}

impl PgOAuthTokenRepo {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl OAuthTokenRepo for PgOAuthTokenRepo {
    async fn create(&self, token: &OAuthRefreshToken) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO oauth_refresh_tokens \
             (id, app_id, user_id, token_hash, created_at) \
             VALUES ($1, $2, $3, $4, $5)",
        )
        .bind(token.id)
        .bind(token.app_id)
        .bind(token.user_id)
        .bind(&token.token_hash)
        .bind(token.created_at)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn find_by_hash(&self, hash: &str) -> Result<Option<OAuthRefreshToken>, ApiError> {
        let row = sqlx::query_as::<_, TokenRow>(
            "SELECT id, app_id, user_id, token_hash, created_at, last_used_at, revoked_at \
             FROM oauth_refresh_tokens WHERE token_hash = $1",
        )
        .bind(hash)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.map(Into::into))
    }

    async fn revoke(&self, token_id: Uuid) -> Result<(), ApiError> {
        sqlx::query(
            "UPDATE oauth_refresh_tokens SET revoked_at = NOW() \
             WHERE id = $1 AND revoked_at IS NULL",
        )
        .bind(token_id)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn revoke_all_for_app(&self, app_id: Uuid) -> Result<(), ApiError> {
        sqlx::query(
            "UPDATE oauth_refresh_tokens SET revoked_at = NOW() \
             WHERE app_id = $1 AND revoked_at IS NULL",
        )
        .bind(app_id)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn touch(&self, token_id: Uuid) -> Result<(), ApiError> {
        sqlx::query(
            "UPDATE oauth_refresh_tokens SET last_used_at = NOW() WHERE id = $1",
        )
        .bind(token_id)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }
}
