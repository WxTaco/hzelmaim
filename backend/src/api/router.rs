//! HTTP and WebSocket route registration.

use axum::{routing::get, Router};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::{api::{openapi, routes}, app_state::AppState};

/// Builds the top-level application router.
pub fn build_router(state: AppState) -> Router {
    Router::new()
        .merge(routes::auth::router())
        .merge(routes::oauth::router())
        .nest(
            "/api/v1/containers",
            routes::containers::router()
                .merge(routes::networks::container_sub_router())
                .merge(routes::webhooks::crud_router()),
        )
        .nest("/api/v1/networks", routes::networks::router())
        .nest("/api/v1/programs", routes::programs::router())
        .nest("/api/v1", routes::commands::router())
        .nest("/api/v1", routes::audit::router())
        .nest("/ws", routes::ws::router())
        .route("/api/v1/openapi.json", get(openapi::openapi_json))
        .merge(routes::webhooks::receiver_router())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
