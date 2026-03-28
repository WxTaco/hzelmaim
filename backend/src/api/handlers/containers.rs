//! Container lifecycle handlers.

use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    api::response::ApiResponse,
    app_state::AppState,
    auth::{context::AuthenticatedUser, csrf::CsrfProtected},
    models::container::ContainerRecord,
    proxmox::types::{ContainerMetrics, CreateContainerRequest, ResourceLimits},
    utils::error::ApiError,
};

/// Simplified API request body for container creation.
/// Server-side config provides node_name, template, and default resource limits.
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct ApiCreateContainerRequest {
    pub hostname: String,
    /// Optional overrides for resource limits.
    pub cpu_cores: Option<u8>,
    pub memory_mb: Option<u32>,
    pub disk_gb: Option<u32>,
}

/// Returns containers visible to the authenticated actor.
#[utoipa::path(
    get,
    path = "/api/v1/containers",
    responses(
        (status = 200, description = "List of containers", body = inline(ApiResponse<Vec<ContainerRecord>>)),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "containers",
)]
pub async fn list(
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<Vec<ContainerRecord>>>, ApiError> {
    Ok(Json(ApiResponse::new(
        state.container_service.list_for_user(&actor).await?,
    )))
}

/// Creates a new secure unprivileged LXC container.
#[utoipa::path(
    post,
    path = "/api/v1/containers",
    request_body = ApiCreateContainerRequest,
    responses(
        (status = 200, description = "Container created", body = inline(ApiResponse<ContainerRecord>)),
        (status = 400, description = "Validation error"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
    ),
    security(("bearer_auth" = [])),
    tag = "containers",
)]
pub async fn create(_csrf: CsrfProtected, State(state): State<AppState>, actor: AuthenticatedUser, Json(body): Json<ApiCreateContainerRequest>) -> Result<Json<ApiResponse<ContainerRecord>>, ApiError> {
    // Check program-based permission — admins always pass, others need an accepted
    // membership in a program that grants can_create_containers.
    if !state.program_service.user_can_create_container(&actor).await? {
        return Err(ApiError::forbidden(
            "You must be a member of a program that grants container creation access",
        ));
    }

    let disk_gb = body.disk_gb.unwrap_or(18);
    if !(18..=32).contains(&disk_gb) {
        return Err(ApiError::validation("disk_gb must be between 18 and 32"));
    }

    let request = CreateContainerRequest {
        node_name: state.config.proxmox_node.clone(),
        hostname: body.hostname,
        template_ctid: state.config.proxmox_template_ctid,
        resource_limits: ResourceLimits {
            cpu_cores: body.cpu_cores.unwrap_or(1),
            memory_mb: body.memory_mb.unwrap_or(512),
            disk_gb,
        },
        ssh_public_keys: vec![],
    };
    Ok(Json(ApiResponse::new(
        state.container_service.create(&actor, request).await?,
    )))
}

/// Returns a single container by id.
#[utoipa::path(
    get,
    path = "/api/v1/containers/{container_id}",
    params(
        ("container_id" = uuid::Uuid, Path, description = "Container UUID"),
    ),
    responses(
        (status = 200, description = "Container record", body = inline(ApiResponse<ContainerRecord>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "containers",
)]
pub async fn get(
    Path(container_id): Path<Uuid>,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<ContainerRecord>>, ApiError> {
    Ok(Json(ApiResponse::new(
        state.container_service.get(&actor, container_id).await?,
    )))
}

/// Starts a container and returns the verified container record.
///
/// Polls Proxmox after issuing the start command so that the returned
/// `state` field reflects the actual runtime state rather than an optimistic
/// guess. Returns `state: "failed"` if the transition could not be confirmed
/// within the polling window.
#[utoipa::path(
    post,
    path = "/api/v1/containers/{container_id}/start",
    params(("container_id" = uuid::Uuid, Path, description = "Container UUID")),
    responses(
        (status = 200, description = "Container started", body = inline(ApiResponse<ContainerRecord>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "containers",
)]
pub async fn start(
    Path(container_id): Path<Uuid>,
    _csrf: CsrfProtected,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<ContainerRecord>>, ApiError> {
    let record = state.container_service.start(&actor, container_id).await?;
    Ok(Json(ApiResponse::new(record)))
}

/// Stops a container and returns the verified container record.
///
/// Polls Proxmox after issuing the stop command so that the returned
/// `state` field reflects the actual runtime state rather than an optimistic
/// guess. Returns `state: "failed"` if the transition could not be confirmed
/// within the polling window.
#[utoipa::path(
    post,
    path = "/api/v1/containers/{container_id}/stop",
    params(("container_id" = uuid::Uuid, Path, description = "Container UUID")),
    responses(
        (status = 200, description = "Container stopped", body = inline(ApiResponse<ContainerRecord>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "containers",
)]
pub async fn stop(
    Path(container_id): Path<Uuid>,
    _csrf: CsrfProtected,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<ContainerRecord>>, ApiError> {
    let record = state.container_service.stop(&actor, container_id).await?;
    Ok(Json(ApiResponse::new(record)))
}

/// Restarts a container and returns the verified container record.
///
/// Polls Proxmox after issuing the restart command so that the returned
/// `state` field reflects the actual runtime state rather than an optimistic
/// guess. Returns `state: "failed"` if the transition could not be confirmed
/// within the polling window.
#[utoipa::path(
    post,
    path = "/api/v1/containers/{container_id}/restart",
    params(("container_id" = uuid::Uuid, Path, description = "Container UUID")),
    responses(
        (status = 200, description = "Container restarted", body = inline(ApiResponse<ContainerRecord>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "containers",
)]
pub async fn restart(
    Path(container_id): Path<Uuid>,
    _csrf: CsrfProtected,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<ContainerRecord>>, ApiError> {
    let record = state
        .container_service
        .restart(&actor, container_id)
        .await?;
    Ok(Json(ApiResponse::new(record)))
}

/// Returns container metrics.
#[utoipa::path(
    get,
    path = "/api/v1/containers/{container_id}/metrics",
    params(("container_id" = uuid::Uuid, Path, description = "Container UUID")),
    responses(
        (status = 200, description = "Container metrics", body = inline(ApiResponse<ContainerMetrics>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "containers",
)]
pub async fn metrics(
    Path(container_id): Path<Uuid>,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<ContainerMetrics>>, ApiError> {
    Ok(Json(ApiResponse::new(
        state
            .container_service
            .metrics(&actor, container_id)
            .await?,
    )))
}
