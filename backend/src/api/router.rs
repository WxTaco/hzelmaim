//! HTTP and WebSocket route registration.

use axum::Router;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::{api::routes, app_state::AppState};

/// Builds the top-level application router.
pub fn build_router(state: AppState) -> Router {
    Router::new()
        .merge(routes::auth::router())
        .merge(routes::oauth::router())
        .nest("/api/v1/containers", routes::containers::router())
        .nest("/api/v1/programs", routes::programs::router())
        .nest("/api/v1", routes::commands::router())
        .nest("/api/v1", routes::audit::router())
        .nest("/ws", routes::ws::router())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
