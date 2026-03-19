//! Audit log route definitions.

use axum::{routing::get, Router};

use crate::{api::handlers::audit, app_state::AppState};

/// Builds audit log routes.
pub fn router() -> Router<AppState> {
    Router::new().route("/audit-logs", get(audit::list))
}
