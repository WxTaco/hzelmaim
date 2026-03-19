//! Authentication and health route definitions.

use axum::{
    routing::{get, post},
    Router,
};

use crate::{api::handlers::auth, app_state::AppState};

/// Builds authentication and health routes.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/v1/healthz", get(auth::health))
        .nest(
            "/api/v1/auth",
            Router::new()
                .route("/login", post(auth::login))
                .route("/logout", post(auth::logout))
                .route("/session", get(auth::session))
                .route("/me", get(auth::me))
                .route("/refresh", post(auth::refresh_token))
                .route("/oidc/authorize", get(auth::oidc_authorize))
                .route("/oidc/callback", get(auth::oidc_callback)),
        )
}
