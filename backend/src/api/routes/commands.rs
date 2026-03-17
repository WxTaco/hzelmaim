//! Command execution route definitions.

use axum::{
    routing::{get, post},
    Router,
};

use crate::{api::handlers::commands, app_state::AppState};

/// Builds command submission and lookup routes.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/containers/:container_id/commands", post(commands::enqueue))
        .route("/commands/:job_id", get(commands::get))
}