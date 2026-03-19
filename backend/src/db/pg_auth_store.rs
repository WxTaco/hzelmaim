//! PostgreSQL-backed implementation of the AuthStore trait.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    auth::store::AuthStore,
    db::Pool,
    models::{
        session::{AuthMethod, SessionRecord},
        user::{UserRecord, UserRole, UserStatus},
    },
    utils::error::ApiError,
};

/// PostgreSQL implementation of the authentication store.
pub struct PgAuthStore {
    pool: Pool,
}

impl PgAuthStore {
    /// Creates a new PostgreSQL auth store.
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

/// Row type for user queries.
#[derive(sqlx::FromRow)]
struct UserRow {
    id: Uuid,
    email: String,
    role: String,
    status: String,
    created_at: DateTime<Utc>,
}

/// Row type for session queries.
#[derive(sqlx::FromRow)]
struct SessionRow {
    id: Uuid,
    user_id: Uuid,
    csrf_token: String,
    auth_method: String,
    expires_at: DateTime<Utc>,
    created_at: DateTime<Utc>,
    last_seen_at: DateTime<Utc>,
    revoked_at: Option<DateTime<Utc>>,
}

fn parse_role(s: &str) -> UserRole {
    match s {
        "admin" => UserRole::Admin,
        _ => UserRole::User,
    }
}

fn parse_status(s: &str) -> UserStatus {
    match s {
        "disabled" => UserStatus::Disabled,
        _ => UserStatus::Active,
    }
}

fn parse_auth_method(s: &str) -> AuthMethod {
    match s {
        "oidc" => AuthMethod::Oidc,
        _ => AuthMethod::Session,
    }
}

impl From<UserRow> for UserRecord {
    fn from(row: UserRow) -> Self {
        Self {
            id: row.id,
            email: row.email,
            role: parse_role(&row.role),
            status: parse_status(&row.status),
            created_at: row.created_at,
        }
    }
}

impl From<SessionRow> for SessionRecord {
    fn from(row: SessionRow) -> Self {
        Self {
            id: row.id,
            user_id: row.user_id,
            csrf_token: row.csrf_token,
            auth_method: parse_auth_method(&row.auth_method),
            expires_at: row.expires_at,
            created_at: row.created_at,
            last_seen_at: row.last_seen_at,
            revoked_at: row.revoked_at,
        }
    }
}

#[async_trait]
impl AuthStore for PgAuthStore {
    async fn get_user(&self, user_id: Uuid) -> Result<Option<UserRecord>, ApiError> {
        let row = sqlx::query_as::<_, UserRow>(
            "SELECT id, email, role, status, created_at FROM users WHERE id = $1",
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        Ok(row.map(Into::into))
    }

    async fn get_session(&self, session_id: Uuid) -> Result<Option<SessionRecord>, ApiError> {
        let row = sqlx::query_as::<_, SessionRow>(
            "SELECT id, user_id, csrf_token, auth_method, expires_at, created_at, last_seen_at, revoked_at FROM user_sessions WHERE id = $1",
        )
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        Ok(row.map(Into::into))
    }

    async fn touch_session(&self, session_id: Uuid) -> Result<(), ApiError> {
        sqlx::query("UPDATE user_sessions SET last_seen_at = NOW() WHERE id = $1")
            .bind(session_id)
            .execute(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn revoke_session(&self, session_id: Uuid) -> Result<(), ApiError> {
        sqlx::query("UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1")
            .bind(session_id)
            .execute(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn create_session(&self, session: &SessionRecord) -> Result<(), ApiError> {
        let auth_method_str = match session.auth_method {
            AuthMethod::Session => "session",
            AuthMethod::Oidc => "oidc",
        };
        sqlx::query(
            "INSERT INTO user_sessions (id, user_id, csrf_token, auth_method, expires_at, created_at, last_seen_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        )
        .bind(session.id)
        .bind(session.user_id)
        .bind(&session.csrf_token)
        .bind(auth_method_str)
        .bind(session.expires_at)
        .bind(session.created_at)
        .bind(session.last_seen_at)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }
}

