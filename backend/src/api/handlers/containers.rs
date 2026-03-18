//! Container lifecycle handlers.

use axum::{extract::{Path, State}, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::{api::response::ApiResponse, app_state::AppState, auth::{context::AuthenticatedUser, csrf::CsrfProtected}, models::container::{ContainerRecord, CreateContainerResult}, proxmox::types::{ContainerMetrics, CreateContainerRequest, ResourceLimits}, utils::error::ApiError};

/// Simplified API request body for container creation.
/// Server-side config provides node_name, template, and default resource limits.
#[derive(Debug, Deserialize)]
pub struct ApiCreateContainerRequest {
    pub hostname: String,
    /// Optional overrides for resource limits.
    pub cpu_cores: Option<u8>,
    pub memory_mb: Option<u32>,
    pub disk_gb: Option<u32>,
}

/// Returns containers visible to the authenticated actor.
pub async fn list(State(state): State<AppState>, actor: AuthenticatedUser) -> Result<Json<ApiResponse<Vec<ContainerRecord>>>, ApiError> {
    Ok(Json(ApiResponse::new(state.container_service.list_for_user(&actor).await?)))
}

/// Creates a new secure unprivileged LXC container.
pub async fn create(_csrf: CsrfProtected, State(state): State<AppState>, actor: AuthenticatedUser, Json(body): Json<ApiCreateContainerRequest>) -> Result<Json<ApiResponse<CreateContainerResult>>, ApiError> {
    let request = CreateContainerRequest {
        node_name: state.config.proxmox_node.clone(),
        hostname: body.hostname,
        template_ctid: state.config.proxmox_template_ctid,
        resource_limits: ResourceLimits {
            cpu_cores: body.cpu_cores.unwrap_or(1),
            memory_mb: body.memory_mb.unwrap_or(512),
            disk_gb: body.disk_gb.unwrap_or(8),
        },
        ssh_public_keys: vec![],
    };
    Ok(Json(ApiResponse::new(state.container_service.create(&actor, request).await?)))
}

/// Returns a single container by id.
pub async fn get(Path(container_id): Path<Uuid>, State(state): State<AppState>, actor: AuthenticatedUser) -> Result<Json<ApiResponse<ContainerRecord>>, ApiError> {
    Ok(Json(ApiResponse::new(state.container_service.get(&actor, container_id).await?)))
}

/// Starts a container.
pub async fn start(Path(container_id): Path<Uuid>, _csrf: CsrfProtected, State(state): State<AppState>, actor: AuthenticatedUser) -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    state.container_service.start(&actor, container_id).await?;
    Ok(Json(ApiResponse::new("queued")))
}

/// Stops a container.
pub async fn stop(Path(container_id): Path<Uuid>, _csrf: CsrfProtected, State(state): State<AppState>, actor: AuthenticatedUser) -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    state.container_service.stop(&actor, container_id).await?;
    Ok(Json(ApiResponse::new("queued")))
}

/// Restarts a container.
pub async fn restart(Path(container_id): Path<Uuid>, _csrf: CsrfProtected, State(state): State<AppState>, actor: AuthenticatedUser) -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    state.container_service.restart(&actor, container_id).await?;
    Ok(Json(ApiResponse::new("queued")))
}

/// Returns container metrics.
pub async fn metrics(Path(container_id): Path<Uuid>, State(state): State<AppState>, actor: AuthenticatedUser) -> Result<Json<ApiResponse<ContainerMetrics>>, ApiError> {
    Ok(Json(ApiResponse::new(state.container_service.metrics(&actor, container_id).await?)))
}
