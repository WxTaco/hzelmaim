//! Persistence layer for programs and program invitations.
//!
//! Uses runtime (non-macro) sqlx queries to avoid requiring a live database
//! connection at compile time — consistent with the rest of the codebase.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::{
    models::program::{PendingInvitationView, ProgramInvitation, ProgramMember, ProgramRecord},
    utils::error::ApiError,
};

#[async_trait]
pub trait ProgramRepo: Send + Sync {
    async fn create(&self, record: &ProgramRecord) -> Result<(), ApiError>;
    async fn list(&self) -> Result<Vec<ProgramRecord>, ApiError>;
    async fn get(&self, id: Uuid) -> Result<Option<ProgramRecord>, ApiError>;
    async fn update_permissions(&self, id: Uuid, can_create_containers: bool) -> Result<(), ApiError>;
    async fn find_user_by_email(&self, email: &str) -> Result<Option<Uuid>, ApiError>;
    async fn create_invitation(&self, inv: &ProgramInvitation) -> Result<(), ApiError>;
    async fn list_members(&self, program_id: Uuid) -> Result<Vec<ProgramMember>, ApiError>;
    async fn pending_for_user(&self, user_id: Uuid) -> Result<Vec<PendingInvitationView>, ApiError>;
    async fn get_invitation(&self, id: Uuid) -> Result<Option<ProgramInvitation>, ApiError>;
    async fn respond(&self, id: Uuid, response: &str) -> Result<(), ApiError>;
    /// Returns true if the user is an accepted member of any program that grants container creation.
    async fn user_can_create_container(&self, user_id: Uuid) -> Result<bool, ApiError>;
}

pub struct PgProgramRepo {
    pool: PgPool,
}

impl PgProgramRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

// ---------------------------------------------------------------------------
// Internal row structs — sqlx maps column values into these.
// ---------------------------------------------------------------------------

#[derive(FromRow)]
struct ProgramRow {
    id: Uuid,
    name: String,
    description: String,
    created_by: Uuid,
    created_at: DateTime<Utc>,
    can_create_containers: bool,
}

impl From<ProgramRow> for ProgramRecord {
    fn from(r: ProgramRow) -> Self {
        Self {
            id: r.id, name: r.name, description: r.description,
            created_by: r.created_by, created_at: r.created_at,
            can_create_containers: r.can_create_containers,
        }
    }
}

#[derive(FromRow)]
struct MemberRow {
    user_id: Uuid,
    email: String,
    display_name: Option<String>,
    invited_at: DateTime<Utc>,
    responded_at: Option<DateTime<Utc>>,
}

impl From<MemberRow> for ProgramMember {
    fn from(r: MemberRow) -> Self {
        Self {
            user_id: r.user_id, email: r.email, display_name: r.display_name,
            invited_at: r.invited_at, responded_at: r.responded_at,
        }
    }
}

#[derive(FromRow)]
struct InvitationRow {
    id: Uuid,
    program_id: Uuid,
    user_id: Uuid,
    invited_by: Uuid,
    invited_at: DateTime<Utc>,
    responded_at: Option<DateTime<Utc>>,
    response: Option<String>,
}

impl From<InvitationRow> for ProgramInvitation {
    fn from(r: InvitationRow) -> Self {
        Self { id: r.id, program_id: r.program_id, user_id: r.user_id, invited_by: r.invited_by,
               invited_at: r.invited_at, responded_at: r.responded_at, response: r.response }
    }
}

#[derive(FromRow)]
struct PendingRow {
    id: Uuid,
    program_id: Uuid,
    program_name: String,
    program_description: String,
    invited_by_display_name: Option<String>,
    invited_by_email: String,
    invited_at: DateTime<Utc>,
}

impl From<PendingRow> for PendingInvitationView {
    fn from(r: PendingRow) -> Self {
        Self { id: r.id, program_id: r.program_id, program_name: r.program_name,
               program_description: r.program_description,
               invited_by_display_name: r.invited_by_display_name,
               invited_by_email: r.invited_by_email, invited_at: r.invited_at }
    }
}

// ---------------------------------------------------------------------------

#[async_trait]
impl ProgramRepo for PgProgramRepo {
    async fn create(&self, r: &ProgramRecord) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO programs (id, name, description, created_by, created_at, can_create_containers)
             VALUES ($1, $2, $3, $4, $5, $6)",
        )
        .bind(r.id).bind(&r.name).bind(&r.description).bind(r.created_by).bind(r.created_at)
        .bind(r.can_create_containers)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("DB error: {e}")))?;
        Ok(())
    }

    async fn list(&self) -> Result<Vec<ProgramRecord>, ApiError> {
        let rows = sqlx::query_as::<_, ProgramRow>(
            "SELECT id, name, description, created_by, created_at, can_create_containers
             FROM programs ORDER BY created_at DESC",
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("DB error: {e}")))?;
        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn get(&self, id: Uuid) -> Result<Option<ProgramRecord>, ApiError> {
        let row = sqlx::query_as::<_, ProgramRow>(
            "SELECT id, name, description, created_by, created_at, can_create_containers
             FROM programs WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("DB error: {e}")))?;
        Ok(row.map(Into::into))
    }

    async fn update_permissions(&self, id: Uuid, can_create_containers: bool) -> Result<(), ApiError> {
        sqlx::query(
            "UPDATE programs SET can_create_containers = $1 WHERE id = $2",
        )
        .bind(can_create_containers).bind(id)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("DB error: {e}")))?;
        Ok(())
    }

    async fn find_user_by_email(&self, email: &str) -> Result<Option<Uuid>, ApiError> {
        let row: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM users WHERE email = $1")
            .bind(email)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("DB error: {e}")))?;
        Ok(row.map(|(id,)| id))
    }

    async fn create_invitation(&self, inv: &ProgramInvitation) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO program_invitations (id, program_id, user_id, invited_by, invited_at)
             VALUES ($1, $2, $3, $4, $5)",
        )
        .bind(inv.id).bind(inv.program_id).bind(inv.user_id).bind(inv.invited_by).bind(inv.invited_at)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("DB error: {e}")))?;
        Ok(())
    }

    async fn pending_for_user(&self, user_id: Uuid) -> Result<Vec<PendingInvitationView>, ApiError> {
        let rows = sqlx::query_as::<_, PendingRow>(
            r#"SELECT pi.id, pi.program_id,
                      p.name AS program_name, p.description AS program_description,
                      u.display_name AS invited_by_display_name, u.email AS invited_by_email,
                      pi.invited_at
               FROM program_invitations pi
               JOIN programs p ON p.id = pi.program_id
               JOIN users u   ON u.id  = pi.invited_by
               WHERE pi.user_id = $1 AND pi.response IS NULL
               ORDER BY pi.invited_at ASC"#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("DB error: {e}")))?;
        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn get_invitation(&self, id: Uuid) -> Result<Option<ProgramInvitation>, ApiError> {
        let row = sqlx::query_as::<_, InvitationRow>(
            "SELECT id, program_id, user_id, invited_by, invited_at, responded_at, response
             FROM program_invitations WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("DB error: {e}")))?;
        Ok(row.map(Into::into))
    }

    async fn list_members(&self, program_id: Uuid) -> Result<Vec<ProgramMember>, ApiError> {
        let rows = sqlx::query_as::<_, MemberRow>(
            r#"SELECT u.id AS user_id, u.email, u.display_name,
                      pi.invited_at, pi.responded_at
               FROM program_invitations pi
               JOIN users u ON u.id = pi.user_id
               WHERE pi.program_id = $1 AND pi.response = 'accepted'
               ORDER BY pi.responded_at ASC"#,
        )
        .bind(program_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("DB error: {e}")))?;
        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn respond(&self, id: Uuid, response: &str) -> Result<(), ApiError> {
        sqlx::query(
            "UPDATE program_invitations SET response = $1, responded_at = $2 WHERE id = $3",
        )
        .bind(response).bind(Utc::now()).bind(id)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("DB error: {e}")))?;
        Ok(())
    }

    async fn user_can_create_container(&self, user_id: Uuid) -> Result<bool, ApiError> {
        let row: Option<(bool,)> = sqlx::query_as(
            r#"SELECT EXISTS (
                   SELECT 1 FROM program_invitations pi
                   JOIN programs p ON p.id = pi.program_id
                   WHERE pi.user_id = $1
                     AND pi.response = 'accepted'
                     AND p.can_create_containers = true
               )"#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("DB error: {e}")))?;
        Ok(row.map(|(b,)| b).unwrap_or(false))
    }
}


