//! Command execution handlers.

use axum::{extract::{Path, State}, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::{api::response::ApiResponse, app_state::AppState, auth::{context::AuthenticatedUser, csrf::CsrfProtected}, models::command::CommandExecutionRecord, services::command_service::CommandRequest, utils::error::ApiError};

/// HTTP payload used to enqueue a command for a container.
#[derive(Debug, Deserialize)]
pub struct EnqueueCommandBody {
    pub program: String,
    pub args: Vec<String>,
}

/// Enqueues a command job.
pub async fn enqueue(Path(container_id): Path<Uuid>, _csrf: CsrfProtected, State(state): State<AppState>, actor: AuthenticatedUser, Json(body): Json<EnqueueCommandBody>) -> Result<Json<ApiResponse<CommandExecutionRecord>>, ApiError> {
    let command = CommandRequest { container_id, program: body.program, args: body.args };
    Ok(Json(ApiResponse::new(state.command_service.enqueue(&actor, command).await?)))
}

/// Returns the current state of a queued or running command.
pub async fn get(Path(job_id): Path<Uuid>, State(state): State<AppState>, _actor: AuthenticatedUser) -> Result<Json<ApiResponse<CommandExecutionRecord>>, ApiError> {
    Ok(Json(ApiResponse::new(state.command_service.get(job_id).await?)))
}
