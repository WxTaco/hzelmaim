//! Data models for programs and program invitations.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A program that users can be invited to participate in.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct ProgramRecord {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    /// Grants accepted members the ability to provision containers.
    pub can_create_containers: bool,
}

/// A user who has accepted an invitation to a program.
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ProgramMember {
    pub user_id: Uuid,
    pub email: String,
    pub display_name: Option<String>,
    pub invited_at: DateTime<Utc>,
    pub responded_at: Option<DateTime<Utc>>,
}

/// Full program detail returned to admins — record + accepted members.
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ProgramDetail {
    #[serde(flatten)]
    pub program: ProgramRecord,
    pub members: Vec<ProgramMember>,
}

/// An invitation sent to a user to join a program.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct ProgramInvitation {
    pub id: Uuid,
    pub program_id: Uuid,
    pub user_id: Uuid,
    pub invited_by: Uuid,
    pub invited_at: DateTime<Utc>,
    pub responded_at: Option<DateTime<Utc>>,
    /// `None` until the user responds; then `"accepted"` or `"declined"`.
    pub response: Option<String>,
}

/// Flattened read model returned by the pending-invitations endpoint.
/// Joins programs and users so the frontend has everything it needs in one shot.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct PendingInvitationView {
    pub id: Uuid,
    pub program_id: Uuid,
    pub program_name: String,
    pub program_description: String,
    /// Display name of the admin who sent the invitation (may be absent).
    pub invited_by_display_name: Option<String>,
    /// Email of the admin who sent the invitation.
    pub invited_by_email: String,
    pub invited_at: DateTime<Utc>,
}

