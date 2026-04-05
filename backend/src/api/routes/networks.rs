//! Private network route definitions.

use axum::{
    routing::{delete, get},
    Router,
};

use crate::{api::handlers::networks, app_state::AppState};

/// Builds the `/api/v1/networks` router.
///
/// Routes:
/// ```text
/// GET    /                            → list user's networks
/// POST   /                            → create network         [CSRF]
/// GET    /{network_id}                → get network
/// PATCH  /{network_id}                → rename network         [CSRF]
/// DELETE /{network_id}                → delete network         [CSRF]
/// GET    /{network_id}/members        → list network members
/// POST   /{network_id}/members        → add container          [CSRF]
/// DELETE /{network_id}/members/{cid}  → remove container       [CSRF]
/// ```
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(networks::list_networks).post(networks::create_network))
        .route(
            "/{network_id}",
            get(networks::get_network)
                .patch(networks::rename_network)
                .delete(networks::delete_network),
        )
        .route(
            "/{network_id}/members",
            get(networks::list_members).post(networks::add_member),
        )
        .route(
            "/{network_id}/members/{container_id}",
            delete(networks::remove_member),
        )
}

/// Builds the nested `/{container_id}/networks` sub-router mounted under
/// `/api/v1/containers`.
pub fn container_sub_router() -> Router<AppState> {
    Router::new().route("/networks", get(networks::list_for_container))
}
