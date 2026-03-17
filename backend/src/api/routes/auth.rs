//! Authentication and health route definitions.

use axum::{
    routing::{get, post},
    Router,
};

use crate::{api::handlers::auth, app_state::AppState};

/// Builds authentication and health routes.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/healthz", get(auth::health))
        .nest(
            "/api/v1/auth",
            Router::new()
                .route("/login", post(auth::login))
                .route("/logout", post(auth::logout))
                .route("/session", get(auth::session)),
        )
}