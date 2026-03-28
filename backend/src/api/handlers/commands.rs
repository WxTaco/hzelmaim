//! Command execution handlers.

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
    models::command::CommandExecutionRecord,
    services::command_service::CommandRequest,
    utils::error::ApiError,
};

/// HTTP payload used to enqueue a command for a container.
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct EnqueueCommandBody {
    pub program: String,
    pub args: Vec<String>,
}

/// Enqueues a command job.
#[utoipa::path(
    post,
    path = "/api/v1/containers/{container_id}/commands",
    params(("container_id" = uuid::Uuid, Path, description = "Container UUID")),
    request_body = EnqueueCommandBody,
    responses(
        (status = 200, description = "Command enqueued", body = inline(ApiResponse<CommandExecutionRecord>)),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Container not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "commands",
)]
pub async fn enqueue(
    Path(container_id): Path<Uuid>,
    _csrf: CsrfProtected,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
    Json(body): Json<EnqueueCommandBody>,
) -> Result<Json<ApiResponse<CommandExecutionRecord>>, ApiError> {
    let command = CommandRequest {
        container_id,
        program: body.program,
        args: body.args,
    };
    Ok(Json(ApiResponse::new(
        state.command_service.enqueue(&actor, command).await?,
    )))
}

/// Returns the current state of a queued or running command.
#[utoipa::path(
    get,
    path = "/api/v1/commands/{job_id}",
    params(("job_id" = uuid::Uuid, Path, description = "Command job UUID")),
    responses(
        (status = 200, description = "Command execution record", body = inline(ApiResponse<CommandExecutionRecord>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "commands",
)]
pub async fn get(
    Path(job_id): Path<Uuid>,
    State(state): State<AppState>,
    _actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<CommandExecutionRecord>>, ApiError> {
    Ok(Json(ApiResponse::new(
        state.command_service.get(job_id).await?,
    )))
}
