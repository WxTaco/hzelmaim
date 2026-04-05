//! HTTP handlers for private network CRUD and membership management.

use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::{
    api::response::ApiResponse,
    app_state::AppState,
    auth::{context::AuthenticatedUser, csrf::CsrfProtected},
    models::network::{
        AddMemberRequest, CreateNetworkRequest, NetworkMembership, PrivateNetwork,
        RenameNetworkRequest,
    },
    utils::error::ApiError,
};

// ---------------------------------------------------------------------------
// Network CRUD
// ---------------------------------------------------------------------------

/// `GET /api/v1/networks` — list all private networks owned by the authenticated user.
#[utoipa::path(
    get,
    path = "/api/v1/networks",
    responses(
        (status = 200, description = "List of private networks", body = inline(ApiResponse<Vec<PrivateNetwork>>)),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "networks",
)]
pub async fn list_networks(
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<Vec<PrivateNetwork>>>, ApiError> {
    Ok(Json(ApiResponse::new(
        state.network_service.list_networks(&actor).await?,
    )))
}

/// `POST /api/v1/networks` — create a new private network (Proxmox Linux bridge).
#[utoipa::path(
    post,
    path = "/api/v1/networks",
    request_body = CreateNetworkRequest,
    responses(
        (status = 200, description = "Network created", body = inline(ApiResponse<PrivateNetwork>)),
        (status = 400, description = "Validation error"),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "networks",
)]
pub async fn create_network(
    _csrf: CsrfProtected,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
    Json(body): Json<CreateNetworkRequest>,
) -> Result<Json<ApiResponse<PrivateNetwork>>, ApiError> {
    Ok(Json(ApiResponse::new(
        state.network_service.create_network(&actor, body).await?,
    )))
}

/// `GET /api/v1/networks/{network_id}` — returns a single private network by ID.
#[utoipa::path(
    get,
    path = "/api/v1/networks/{network_id}",
    params(("network_id" = uuid::Uuid, Path, description = "Network UUID")),
    responses(
        (status = 200, description = "Private network record", body = inline(ApiResponse<PrivateNetwork>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "networks",
)]
pub async fn get_network(
    Path(network_id): Path<Uuid>,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<PrivateNetwork>>, ApiError> {
    Ok(Json(ApiResponse::new(
        state.network_service.get_network(&actor, network_id).await?,
    )))
}

/// `PATCH /api/v1/networks/{network_id}` — rename a private network.
#[utoipa::path(
    patch,
    path = "/api/v1/networks/{network_id}",
    params(("network_id" = uuid::Uuid, Path, description = "Network UUID")),
    request_body = RenameNetworkRequest,
    responses(
        (status = 200, description = "Updated network record", body = inline(ApiResponse<PrivateNetwork>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "networks",
)]
pub async fn rename_network(
    Path(network_id): Path<Uuid>,
    _csrf: CsrfProtected,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
    Json(body): Json<RenameNetworkRequest>,
) -> Result<Json<ApiResponse<PrivateNetwork>>, ApiError> {
    Ok(Json(ApiResponse::new(
        state
            .network_service
            .rename_network(&actor, network_id, body)
            .await?,
    )))
}

/// `DELETE /api/v1/networks/{network_id}` — delete a private network and its Proxmox bridge.
///
/// Fails if the network still has container members.
#[utoipa::path(
    delete,
    path = "/api/v1/networks/{network_id}",
    params(("network_id" = uuid::Uuid, Path, description = "Network UUID")),
    responses(
        (status = 200, description = "Network deleted"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "networks",
)]
pub async fn delete_network(
    Path(network_id): Path<Uuid>,
    _csrf: CsrfProtected,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<()>>, ApiError> {
    state
        .network_service
        .delete_network(&actor, network_id)
        .await?;
    Ok(Json(ApiResponse::new(())))
}

// ---------------------------------------------------------------------------
// Membership management
// ---------------------------------------------------------------------------

/// `GET /api/v1/networks/{network_id}/members` — list containers attached to a network.
#[utoipa::path(
    get,
    path = "/api/v1/networks/{network_id}/members",
    params(("network_id" = uuid::Uuid, Path, description = "Network UUID")),
    responses(
        (status = 200, description = "Network memberships", body = inline(ApiResponse<Vec<NetworkMembership>>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "networks",
)]
pub async fn list_members(
    Path(network_id): Path<Uuid>,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<Vec<NetworkMembership>>>, ApiError> {
    Ok(Json(ApiResponse::new(
        state
            .network_service
            .list_members(&actor, network_id)
            .await?,
    )))
}

/// `POST /api/v1/networks/{network_id}/members` — attach a container to a network.
#[utoipa::path(
    post,
    path = "/api/v1/networks/{network_id}/members",
    params(("network_id" = uuid::Uuid, Path, description = "Network UUID")),
    request_body = AddMemberRequest,
    responses(
        (status = 200, description = "Container attached", body = inline(ApiResponse<NetworkMembership>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "networks",
)]
pub async fn add_member(
    Path(network_id): Path<Uuid>,
    _csrf: CsrfProtected,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
    Json(body): Json<AddMemberRequest>,
) -> Result<Json<ApiResponse<NetworkMembership>>, ApiError> {
    Ok(Json(ApiResponse::new(
        state
            .network_service
            .add_member(&actor, network_id, body)
            .await?,
    )))
}

/// `DELETE /api/v1/networks/{network_id}/members/{container_id}` — detach a container.
#[utoipa::path(
    delete,
    path = "/api/v1/networks/{network_id}/members/{container_id}",
    params(
        ("network_id" = uuid::Uuid, Path, description = "Network UUID"),
        ("container_id" = uuid::Uuid, Path, description = "Container UUID"),
    ),
    responses(
        (status = 200, description = "Container detached"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "networks",
)]
pub async fn remove_member(
    Path((network_id, container_id)): Path<(Uuid, Uuid)>,
    _csrf: CsrfProtected,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<()>>, ApiError> {
    state
        .network_service
        .remove_member(&actor, network_id, container_id)
        .await?;
    Ok(Json(ApiResponse::new(())))
}

// ---------------------------------------------------------------------------
// Container-scoped view
// ---------------------------------------------------------------------------

/// `GET /api/v1/containers/{container_id}/networks` — networks a container belongs to.
#[utoipa::path(
    get,
    path = "/api/v1/containers/{container_id}/networks",
    params(("container_id" = uuid::Uuid, Path, description = "Container UUID")),
    responses(
        (status = 200, description = "Network memberships for this container", body = inline(ApiResponse<Vec<NetworkMembership>>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "networks",
)]
pub async fn list_for_container(
    Path(container_id): Path<Uuid>,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<Vec<NetworkMembership>>>, ApiError> {
    Ok(Json(ApiResponse::new(
        state
            .network_service
            .list_for_container(&actor, container_id)
            .await?,
    )))
}
