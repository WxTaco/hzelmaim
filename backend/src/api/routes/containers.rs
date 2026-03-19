//! Container lifecycle route definitions.

use axum::{
    routing::{get, post},
    Router,
};

use crate::{api::handlers::containers, app_state::AppState};

/// Builds container lifecycle and metrics routes.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(containers::list).post(containers::create))
        .route("/{container_id}", get(containers::get))
        .route("/{container_id}/start", post(containers::start))
        .route("/{container_id}/stop", post(containers::stop))
        .route("/{container_id}/restart", post(containers::restart))
        .route("/{container_id}/metrics", get(containers::metrics))
}
