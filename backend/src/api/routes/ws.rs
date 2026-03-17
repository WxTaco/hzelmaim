//! WebSocket route definitions for jobs and terminal sessions.

use axum::{routing::get, Router};

use crate::{api::handlers::stream, app_state::AppState};

/// Builds WebSocket routes.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/jobs/{job_id}", get(stream::job_stream))
        .route("/terminal/{container_id}", get(stream::terminal_stream))
}