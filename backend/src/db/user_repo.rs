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
    /// `display_name` and `picture_url` are refreshed on every call so the
    /// stored profile stays current with the identity provider.
    async fn upsert_oidc_identity(
        &self,
        issuer: &str,
        subject: &str,
        email: &str,
        display_name: Option<&str>,
        picture_url: Option<&str>,
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
    display_name: Option<String>,
    picture_url: Option<String>,
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
            display_name: row.display_name,
            picture_url: row.picture_url,
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
            "SELECT id, email, display_name, picture_url, role, status, created_at \
             FROM users WHERE id = $1",
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.map(Into::into))
    }

    async fn get_by_email(&self, email: &str) -> Result<Option<UserRecord>, ApiError> {
        let row = sqlx::query_as::<_, UserRow>(
            "SELECT id, email, display_name, picture_url, role, status, created_at \
             FROM users WHERE email = $1",
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.map(Into::into))
    }

    async fn create(&self, record: &UserRecord) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO users (id, email, display_name, picture_url, role, status, created_at) \
             VALUES ($1, $2, $3, $4, $5, $6, $7)",
        )
        .bind(record.id)
        .bind(&record.email)
        .bind(&record.display_name)
        .bind(&record.picture_url)
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
        display_name: Option<&str>,
        picture_url: Option<&str>,
    ) -> Result<UserRecord, ApiError> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        // Check if OIDC identity already exists.
        let existing: Option<(Uuid,)> = sqlx::query_as(
            "SELECT user_id FROM oidc_identities WHERE issuer = $1 AND subject = $2",
        )
        .bind(issuer)
        .bind(subject)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        let user_id = if let Some((uid,)) = existing {
            // Refresh profile fields on every login so they stay current.
            sqlx::query(
                "UPDATE users SET display_name = $1, picture_url = $2 WHERE id = $3",
            )
            .bind(display_name)
            .bind(picture_url)
            .bind(uid)
            .execute(&mut *tx)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
            uid
        } else {
            // Check if a user with this email already exists.
            let user_row = sqlx::query_as::<_, UserRow>(
                "SELECT id, email, display_name, picture_url, role, status, created_at \
                 FROM users WHERE email = $1",
            )
            .bind(email)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

            let uid = if let Some(row) = user_row {
                // Link existing user and refresh their profile.
                sqlx::query(
                    "UPDATE users SET display_name = $1, picture_url = $2 WHERE id = $3",
                )
                .bind(display_name)
                .bind(picture_url)
                .bind(row.id)
                .execute(&mut *tx)
                .await
                .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
                row.id
            } else {
                let new_id = Uuid::new_v4();
                sqlx::query(
                    "INSERT INTO users \
                     (id, email, display_name, picture_url, role, status) \
                     VALUES ($1, $2, $3, $4, 'user', 'active')",
                )
                .bind(new_id)
                .bind(email)
                .bind(display_name)
                .bind(picture_url)
                .execute(&mut *tx)
                .await
                .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
                new_id
            };

            let oidc_id = Uuid::new_v4();
            sqlx::query(
                "INSERT INTO oidc_identities \
                 (id, user_id, issuer, subject, email) VALUES ($1, $2, $3, $4, $5)",
            )
            .bind(oidc_id)
            .bind(uid)
            .bind(issuer)
            .bind(subject)
            .bind(email)
            .execute(&mut *tx)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
            uid
        };

        let row = sqlx::query_as::<_, UserRow>(
            "SELECT id, email, display_name, picture_url, role, status, created_at \
             FROM users WHERE id = $1",
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
