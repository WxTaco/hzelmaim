//! PostgreSQL-backed user and OIDC identity persistence.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    db::Pool,
    models::user::{UserRecord, UserRole, UserStatus},
    utils::error::ApiError,
};

/// Persistence boundary for user operations.
#[async_trait]
pub trait UserRepo: Send + Sync {
    /// Loads a user by id.
    async fn get(&self, user_id: Uuid) -> Result<Option<UserRecord>, ApiError>;

    /// Loads a user by email.
    async fn get_by_email(&self, email: &str) -> Result<Option<UserRecord>, ApiError>;

    /// Inserts a new user.
    async fn create(&self, record: &UserRecord) -> Result<(), ApiError>;

    /// Finds or creates a user from an OIDC identity, returning the user record.
    async fn upsert_oidc_identity(
        &self,
        issuer: &str,
        subject: &str,
        email: &str,
    ) -> Result<UserRecord, ApiError>;
}

/// PostgreSQL implementation of the user repository.
pub struct PgUserRepo {
    pool: Pool,
}

impl PgUserRepo {
    /// Creates a new PostgreSQL user repository.
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

#[derive(sqlx::FromRow)]
struct UserRow {
    id: Uuid,
    email: String,
    role: String,
    status: String,
    created_at: DateTime<Utc>,
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

fn role_str(r: &UserRole) -> &'static str {
    match r {
        UserRole::Admin => "admin",
        UserRole::User => "user",
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

#[async_trait]
impl UserRepo for PgUserRepo {
    async fn get(&self, user_id: Uuid) -> Result<Option<UserRecord>, ApiError> {
        let row = sqlx::query_as::<_, UserRow>(
            "SELECT id, email, role, status, created_at FROM users WHERE id = $1",
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.map(Into::into))
    }

    async fn get_by_email(&self, email: &str) -> Result<Option<UserRecord>, ApiError> {
        let row = sqlx::query_as::<_, UserRow>(
            "SELECT id, email, role, status, created_at FROM users WHERE email = $1",
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.map(Into::into))
    }

    async fn create(&self, record: &UserRecord) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO users (id, email, role, status, created_at) VALUES ($1, $2, $3, $4, $5)",
        )
        .bind(record.id)
        .bind(&record.email)
        .bind(role_str(&record.role))
        .bind("active")
        .bind(record.created_at)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn upsert_oidc_identity(
        &self,
        issuer: &str,
        subject: &str,
        email: &str,
    ) -> Result<UserRecord, ApiError> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        // Check if OIDC identity already exists
        let existing: Option<(Uuid,)> = sqlx::query_as(
            "SELECT user_id FROM oidc_identities WHERE issuer = $1 AND subject = $2",
        )
        .bind(issuer)
        .bind(subject)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        let user_id = if let Some((uid,)) = existing {
            uid
        } else {
            // Check if user exists by email
            let user_row = sqlx::query_as::<_, UserRow>(
                "SELECT id, email, role, status, created_at FROM users WHERE email = $1",
            )
            .bind(email)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

            let uid = if let Some(row) = user_row {
                row.id
            } else {
                let new_id = Uuid::new_v4();
                sqlx::query(
                    "INSERT INTO users (id, email, role, status) VALUES ($1, $2, 'user', 'active')",
                )
                .bind(new_id)
                .bind(email)
                .execute(&mut *tx)
                .await
                .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
                new_id
            };

            let oidc_id = Uuid::new_v4();
            sqlx::query("INSERT INTO oidc_identities (id, user_id, issuer, subject, email) VALUES ($1, $2, $3, $4, $5)")
                .bind(oidc_id)
                .bind(uid)
                .bind(issuer)
                .bind(subject)
                .bind(email)
                .execute(&mut *tx).await.map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
            uid
        };

        let row = sqlx::query_as::<_, UserRow>(
            "SELECT id, email, role, status, created_at FROM users WHERE id = $1",
        )
        .bind(user_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        tx.commit()
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.into())
    }
}
