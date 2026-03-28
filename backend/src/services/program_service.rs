//! Business logic for the Programs & Invitations system.

use std::sync::Arc;

use chrono::Utc;
use uuid::Uuid;

use crate::{
    auth::context::AuthenticatedUser,
    db::program_repo::ProgramRepo,
    models::{
        program::{PendingInvitationView, ProgramDetail, ProgramInvitation, ProgramRecord},
        user::UserRole,
    },
    utils::error::ApiError,
};

pub struct ProgramService {
    repo: Arc<dyn ProgramRepo>,
}

impl ProgramService {
    pub fn new(repo: Arc<dyn ProgramRepo>) -> Self {
        Self { repo }
    }

    fn require_admin(actor: &AuthenticatedUser) -> Result<(), ApiError> {
        if actor.effective_role() != &UserRole::Admin {
            return Err(ApiError::forbidden("Admin access required"));
        }
        Ok(())
    }

    /// Create a new program (admin only).
    pub async fn create_program(
        &self,
        actor: &AuthenticatedUser,
        name: String,
        description: String,
        can_create_containers: bool,
    ) -> Result<ProgramRecord, ApiError> {
        Self::require_admin(actor)?;
        let record = ProgramRecord {
            id: Uuid::new_v4(),
            name,
            description,
            created_by: actor.user_id,
            created_at: Utc::now(),
            can_create_containers,
        };
        self.repo.create(&record).await?;
        Ok(record)
    }

    /// Get program detail with member list (admin only).
    pub async fn get_program_detail(
        &self,
        actor: &AuthenticatedUser,
        program_id: Uuid,
    ) -> Result<ProgramDetail, ApiError> {
        Self::require_admin(actor)?;
        let program = self
            .repo
            .get(program_id)
            .await?
            .ok_or_else(|| ApiError::not_found("Program not found"))?;
        let members = self.repo.list_members(program_id).await?;
        Ok(ProgramDetail { program, members })
    }

    /// Update a program's permission flags (admin only).
    pub async fn update_permissions(
        &self,
        actor: &AuthenticatedUser,
        program_id: Uuid,
        can_create_containers: bool,
    ) -> Result<ProgramRecord, ApiError> {
        Self::require_admin(actor)?;
        self.repo.update_permissions(program_id, can_create_containers).await?;
        self.repo
            .get(program_id)
            .await?
            .ok_or_else(|| ApiError::not_found("Program not found"))
    }

    /// Returns true if the user is an admin OR is an accepted member of a
    /// program that grants container creation access.
    ///
    /// OAuth tokens are never treated as admin here — even if the underlying
    /// account is an admin, the token must have an explicit program membership
    /// granting container creation access.
    pub async fn user_can_create_container(
        &self,
        actor: &AuthenticatedUser,
    ) -> Result<bool, ApiError> {
        if actor.effective_role() == &UserRole::Admin {
            return Ok(true);
        }
        self.repo.user_can_create_container(actor.user_id).await
    }

    /// List all programs (admin only).
    pub async fn list_programs(
        &self,
        actor: &AuthenticatedUser,
    ) -> Result<Vec<ProgramRecord>, ApiError> {
        Self::require_admin(actor)?;
        self.repo.list().await
    }

    /// Invite a user by email to a program (admin only).
    /// Returns an error if the program doesn't exist or the email isn't registered.
    pub async fn invite_by_email(
        &self,
        actor: &AuthenticatedUser,
        program_id: Uuid,
        email: String,
    ) -> Result<ProgramInvitation, ApiError> {
        Self::require_admin(actor)?;

        // Ensure the program exists.
        self.repo
            .get(program_id)
            .await?
            .ok_or_else(|| ApiError::not_found("Program not found"))?;

        // Resolve email → user_id.
        let user_id = self
            .repo
            .find_user_by_email(&email)
            .await?
            .ok_or_else(|| ApiError::not_found("No user found with that email address"))?;

        let inv = ProgramInvitation {
            id: Uuid::new_v4(),
            program_id,
            user_id,
            invited_by: actor.user_id,
            invited_at: Utc::now(),
            responded_at: None,
            response: None,
        };
        self.repo.create_invitation(&inv).await?;
        Ok(inv)
    }

    /// Return pending (unanswered) invitations for the current user.
    pub async fn pending_invitations(
        &self,
        actor: &AuthenticatedUser,
    ) -> Result<Vec<PendingInvitationView>, ApiError> {
        self.repo.pending_for_user(actor.user_id).await
    }

    /// Record the user's response to an invitation.
    /// Returns 403 if the invitation belongs to a different user.
    pub async fn respond(
        &self,
        actor: &AuthenticatedUser,
        invitation_id: Uuid,
        response: String,
    ) -> Result<(), ApiError> {
        if response != "accepted" && response != "declined" {
            return Err(ApiError::bad_request(
                r#"response must be "accepted" or "declined""#,
            ));
        }

        let inv = self
            .repo
            .get_invitation(invitation_id)
            .await?
            .ok_or_else(|| ApiError::not_found("Invitation not found"))?;

        if inv.user_id != actor.user_id {
            return Err(ApiError::forbidden(
                "This invitation does not belong to you",
            ));
        }

        self.repo.respond(invitation_id, &response).await
    }
}

