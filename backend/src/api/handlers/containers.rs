//! Container lifecycle handlers.

use axum::{extract::{Path, State}, Json};
use uuid::Uuid;

use crate::{api::response::ApiResponse, app_state::AppState, auth::{context::AuthenticatedUser, csrf::CsrfProtected}, models::container::ContainerRecord, proxmox::types::{ContainerMetrics, CreateContainerRequest}, utils::error::ApiError};

/// Returns containers visible to the authenticated actor.
pub async fn list(State(state): State<AppState>, actor: AuthenticatedUser) -> Result<Json<ApiResponse<Vec<ContainerRecord>>>, ApiError> {
    Ok(Json(ApiResponse::new(state.container_service.list_for_user(&actor).await?)))
}

/// Creates a new secure unprivileged LXC container.
pub async fn create(_csrf: CsrfProtected, State(state): State<AppState>, actor: AuthenticatedUser, Json(request): Json<CreateContainerRequest>) -> Result<Json<ApiResponse<ContainerRecord>>, ApiError> {
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
