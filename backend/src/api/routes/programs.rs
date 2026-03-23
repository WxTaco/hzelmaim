//! Route definitions for the Programs & Invitations system.
//!
//! Axum resolves static path segments with higher priority than dynamic ones,
//! so `/invitations/pending` and `/invitations/:id/respond` are safe to register
//! alongside `/:program_id/invite` without conflict.

use axum::{
    routing::{get, patch, post},
    Router,
};

use crate::{api::handlers::programs, app_state::AppState};

/// Builds and returns the programs sub-router.
/// Mount at `/api/v1/programs`.
pub fn router() -> Router<AppState> {
    Router::new()
        // Admin-only program management
        .route("/", get(programs::list_programs).post(programs::create_program))
        // Static segments — must be registered before /{program_id} to take priority
        .route("/invitations/pending", get(programs::pending_invitations))
        .route("/invitations/{invitation_id}/respond", post(programs::respond))
        .route("/permissions/me", get(programs::my_permissions))
        // Dynamic program-scoped routes
        .route("/{program_id}", get(programs::get_program))
        .route("/{program_id}/invite", post(programs::invite_by_email))
        .route("/{program_id}/permissions", patch(programs::update_permissions))
}

