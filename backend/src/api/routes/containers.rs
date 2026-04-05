//! Container lifecycle route definitions.

use axum::{
    routing::{get, post},
    Router,
};

use crate::{api::handlers::containers, app_state::AppState};

/// Builds container lifecycle, metrics, and sharing invitation routes.
///
/// Static path segments (`/invitations/…`) are registered before the dynamic
/// `/{container_id}/…` routes so that Axum gives them priority.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(containers::list).post(containers::create))
        // Static invitation routes — must precede /{container_id} to avoid conflicts.
        .route(
            "/invitations/pending",
            get(containers::pending_sharing_invitations),
        )
        .route(
            "/invitations/{invitation_id}/respond",
            post(containers::respond_to_sharing_invitation),
        )
        // Dynamic container-scoped routes.
        .route("/{container_id}", get(containers::get))
        .route("/{container_id}/start", post(containers::start))
        .route("/{container_id}/stop", post(containers::stop))
        .route("/{container_id}/restart", post(containers::restart))
        .route("/{container_id}/metrics", get(containers::metrics))
        .route("/{container_id}/share", post(containers::share))
}
