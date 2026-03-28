//! HTTP handlers for the Programs & Invitations system.

use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use serde::Serialize;

use crate::{
    api::response::ApiResponse,
    app_state::AppState,
    auth::context::AuthenticatedUser,
    models::program::{PendingInvitationView, ProgramDetail, ProgramInvitation, ProgramRecord},
    utils::error::ApiError,
};

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateProgramBody {
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub can_create_containers: bool,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct UpdatePermissionsBody {
    pub can_create_containers: bool,
}

/// Response for the permissions/me endpoint.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct UserPermissions {
    pub can_create_containers: bool,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct InviteByEmailBody {
    pub email: String,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct RespondBody {
    pub response: String,
}

/// `POST /api/v1/programs` — create a program (admin only).
#[utoipa::path(
    post,
    path = "/api/v1/programs",
    request_body = CreateProgramBody,
    responses(
        (status = 200, description = "Program created", body = inline(ApiResponse<ProgramRecord>)),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
    ),
    security(("bearer_auth" = [])),
    tag = "programs",
)]
pub async fn create_program(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Json(body): Json<CreateProgramBody>,
) -> Result<Json<ApiResponse<ProgramRecord>>, ApiError> {
    let record = state
        .program_service
        .create_program(&user, body.name, body.description, body.can_create_containers)
        .await?;
    Ok(Json(ApiResponse::new(record)))
}

/// `GET /api/v1/programs/{program_id}` — program detail with members (admin only).
#[utoipa::path(
    get,
    path = "/api/v1/programs/{program_id}",
    params(("program_id" = uuid::Uuid, Path, description = "Program UUID")),
    responses(
        (status = 200, description = "Program detail", body = inline(ApiResponse<ProgramDetail>)),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "programs",
)]
pub async fn get_program(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(program_id): Path<Uuid>,
) -> Result<Json<ApiResponse<ProgramDetail>>, ApiError> {
    let detail = state
        .program_service
        .get_program_detail(&user, program_id)
        .await?;
    Ok(Json(ApiResponse::new(detail)))
}

/// `PATCH /api/v1/programs/{program_id}/permissions` — update permission flags (admin only).
#[utoipa::path(
    patch,
    path = "/api/v1/programs/{program_id}/permissions",
    params(("program_id" = uuid::Uuid, Path, description = "Program UUID")),
    request_body = UpdatePermissionsBody,
    responses(
        (status = 200, description = "Updated program record", body = inline(ApiResponse<ProgramRecord>)),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
    ),
    security(("bearer_auth" = [])),
    tag = "programs",
)]
pub async fn update_permissions(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(program_id): Path<Uuid>,
    Json(body): Json<UpdatePermissionsBody>,
) -> Result<Json<ApiResponse<ProgramRecord>>, ApiError> {
    let record = state
        .program_service
        .update_permissions(&user, program_id, body.can_create_containers)
        .await?;
    Ok(Json(ApiResponse::new(record)))
}

/// `GET /api/v1/programs/permissions/me` — effective permissions for the current user.
#[utoipa::path(
    get,
    path = "/api/v1/programs/permissions/me",
    responses(
        (status = 200, description = "Current user permissions", body = inline(ApiResponse<UserPermissions>)),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "programs",
)]
pub async fn my_permissions(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<ApiResponse<UserPermissions>>, ApiError> {
    let can_create_containers = state.program_service.user_can_create_container(&user).await?;
    Ok(Json(ApiResponse::new(UserPermissions { can_create_containers })))
}

/// `GET /api/v1/programs` — list all programs (admin only).
#[utoipa::path(
    get,
    path = "/api/v1/programs",
    responses(
        (status = 200, description = "List of programs", body = inline(ApiResponse<Vec<ProgramRecord>>)),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
    ),
    security(("bearer_auth" = [])),
    tag = "programs",
)]
pub async fn list_programs(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<ApiResponse<Vec<ProgramRecord>>>, ApiError> {
    let programs = state.program_service.list_programs(&user).await?;
    Ok(Json(ApiResponse::new(programs)))
}

/// `POST /api/v1/programs/:program_id/invite` — invite a user by email (admin only).
#[utoipa::path(
    post,
    path = "/api/v1/programs/{program_id}/invite",
    params(("program_id" = uuid::Uuid, Path, description = "Program UUID")),
    request_body = InviteByEmailBody,
    responses(
        (status = 200, description = "Invitation created", body = inline(ApiResponse<ProgramInvitation>)),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
    ),
    security(("bearer_auth" = [])),
    tag = "programs",
)]
pub async fn invite_by_email(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(program_id): Path<Uuid>,
    Json(body): Json<InviteByEmailBody>,
) -> Result<Json<ApiResponse<ProgramInvitation>>, ApiError> {
    let inv = state
        .program_service
        .invite_by_email(&user, program_id, body.email)
        .await?;
    Ok(Json(ApiResponse::new(inv)))
}

/// `GET /api/v1/programs/invitations/pending` — pending invitations for the current user.
#[utoipa::path(
    get,
    path = "/api/v1/programs/invitations/pending",
    responses(
        (status = 200, description = "Pending invitations for the current user", body = inline(ApiResponse<Vec<PendingInvitationView>>)),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "programs",
)]
pub async fn pending_invitations(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<ApiResponse<Vec<PendingInvitationView>>>, ApiError> {
    let invitations = state.program_service.pending_invitations(&user).await?;
    Ok(Json(ApiResponse::new(invitations)))
}

/// `POST /api/v1/programs/invitations/:invitation_id/respond` — accept or decline.
#[utoipa::path(
    post,
    path = "/api/v1/programs/invitations/{invitation_id}/respond",
    params(("invitation_id" = uuid::Uuid, Path, description = "Invitation UUID")),
    request_body = RespondBody,
    responses(
        (status = 200, description = "Response recorded"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "programs",
)]
pub async fn respond(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(invitation_id): Path<Uuid>,
    Json(body): Json<RespondBody>,
) -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    state
        .program_service
        .respond(&user, invitation_id, body.response)
        .await?;
    Ok(Json(ApiResponse::new("ok")))
}

