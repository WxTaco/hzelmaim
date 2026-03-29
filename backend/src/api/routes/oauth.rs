//! OAuth 2.0 route definitions.

use axum::{
    routing::{get, post},
    Router,
};

use crate::{api::handlers::oauth, app_state::AppState};

/// Builds OAuth application management and authorization code flow routes.
pub fn router() -> Router<AppState> {
    Router::new()
        // ── App management ───────────────────────────────────────────────────
        .nest(
            "/api/v1/oauth/apps",
            Router::new()
                .route("/", post(oauth::create_app).get(oauth::list_apps))
                // Public info endpoint — no auth required, used by the consent page.
                .route("/public/{client_id}", get(oauth::public_app_info))
                .route("/{id}", get(oauth::get_app).patch(oauth::update_app).delete(oauth::delete_app))
                .route("/{id}/secret", post(oauth::rotate_secret)),
        )
        // ── Authorization code flow ──────────────────────────────────────────
        .nest(
            "/api/v1/oauth",
            Router::new()
                .route("/authorize", get(oauth::authorize_get))
                .route("/authorize", post(oauth::authorize_post))
                .route("/token", post(oauth::token))
                .route("/token/revoke", post(oauth::revoke)),
        )
}
