//! Webhook route definitions — CRUD (under containers) and the inbound receiver.

use axum::{
    routing::{get, post},
    Router,
};

use crate::{api::handlers::webhooks, app_state::AppState};

/// Builds the webhooks CRUD sub-router.
///
/// Merged into the containers nest so the full paths are:
/// ```text
/// GET    /api/v1/containers/{container_id}/webhooks
/// POST   /api/v1/containers/{container_id}/webhooks
/// GET    /api/v1/containers/{container_id}/webhooks/{webhook_id}
/// PATCH  /api/v1/containers/{container_id}/webhooks/{webhook_id}
/// DELETE /api/v1/containers/{container_id}/webhooks/{webhook_id}
/// GET    /api/v1/containers/{container_id}/webhooks/{webhook_id}/deliveries
/// ```
pub fn crud_router() -> Router<AppState> {
    Router::new()
        .route(
            "/{container_id}/webhooks",
            get(webhooks::list_configs).post(webhooks::create_config),
        )
        .route(
            "/{container_id}/webhooks/{webhook_id}",
            get(webhooks::get_config)
                .patch(webhooks::update_config)
                .delete(webhooks::delete_config),
        )
        .route(
            "/{container_id}/webhooks/{webhook_id}/deliveries",
            get(webhooks::list_deliveries),
        )
}

/// Builds the inbound webhook receiver router.
///
/// Mounted at the top level (`/webhooks/{webhook_id}`) with **no** CSRF or
/// authentication middleware — the only auth is the provider's HMAC signature.
pub fn receiver_router() -> Router<AppState> {
    Router::new().route("/webhooks/{webhook_id}", post(webhooks::receive_webhook))
}
