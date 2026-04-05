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
    models::container::{
        ContainerInvitation, ContainerRecord, ContainerWithPermissions,
        PendingContainerInvitationView,
    },
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
        (status = 200, description = "List of containers", body = inline(ApiResponse<Vec<ContainerWithPermissions>>)),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "containers",
)]
pub async fn list(
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<Vec<ContainerWithPermissions>>>, ApiError> {
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
        (status = 200, description = "Container record with caller's permission bitmask", body = inline(ApiResponse<ContainerWithPermissions>)),
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
) -> Result<Json<ApiResponse<ContainerWithPermissions>>, ApiError> {
    let container = state.container_service.get(&actor, container_id).await?;
    let permissions = state
        .container_service
        .get_permissions_for_user(&actor, container_id)
        .await?;
    Ok(Json(ApiResponse::new(ContainerWithPermissions {
        container,
        permissions: permissions.0,
    })))
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

// ── Container sharing invitations ────────────────────────────────────────────

/// Request body for inviting a user to share a container.
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct ShareContainerBody {
    pub email: String,
    /// Permission bitmask to grant the invitee when they accept.
    ///
    /// Must be a subset of the caller's own permissions and must always include
    /// bit 1 (`PERM_VIEW`).  If omitted, defaults to `3` (view + metrics).
    #[serde(default = "default_share_permissions")]
    pub permissions: i32,
}

fn default_share_permissions() -> i32 {
    crate::models::container::PRESET_VIEWER
}

/// Request body for responding to a container-sharing invitation.
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct SharingRespondBody {
    /// Must be `"accepted"` or `"declined"`.
    pub response: String,
}

/// `POST /api/v1/containers/{container_id}/share` — invite a user by email.
///
/// Only the container owner may send invitations.
/// The invited user must already have an account on the platform.
/// Supports session, OAuth, and PAT authentication.
#[utoipa::path(
    post,
    path = "/api/v1/containers/{container_id}/share",
    params(("container_id" = uuid::Uuid, Path, description = "Container UUID")),
    request_body = ShareContainerBody,
    responses(
        (status = 200, description = "Invitation created", body = inline(ApiResponse<ContainerInvitation>)),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden — only the container owner may invite"),
        (status = 404, description = "Container or email not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "containers",
)]
pub async fn share(
    Path(container_id): Path<Uuid>,
    _csrf: CsrfProtected,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
    Json(body): Json<ShareContainerBody>,
) -> Result<Json<ApiResponse<ContainerInvitation>>, ApiError> {
    let inv = state
        .container_service
        .invite_by_email(&actor, container_id, body.email, body.permissions)
        .await?;
    Ok(Json(ApiResponse::new(inv)))
}

/// `GET /api/v1/containers/invitations/pending` — list pending sharing invitations.
///
/// Returns all unanswered container-sharing invitations addressed to the current user.
/// Supports session, OAuth, and PAT authentication.
#[utoipa::path(
    get,
    path = "/api/v1/containers/invitations/pending",
    responses(
        (status = 200, description = "Pending container-sharing invitations", body = inline(ApiResponse<Vec<PendingContainerInvitationView>>)),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "containers",
)]
pub async fn pending_sharing_invitations(
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<Vec<PendingContainerInvitationView>>>, ApiError> {
    let invitations = state.container_service.pending_invitations(&actor).await?;
    Ok(Json(ApiResponse::new(invitations)))
}

/// `POST /api/v1/containers/invitations/{invitation_id}/respond` — accept or decline.
///
/// Only the invited user may respond. Accepting grants `viewer` access to the container.
/// Supports session, OAuth, and PAT authentication.
#[utoipa::path(
    post,
    path = "/api/v1/containers/invitations/{invitation_id}/respond",
    params(("invitation_id" = uuid::Uuid, Path, description = "Invitation UUID")),
    request_body = SharingRespondBody,
    responses(
        (status = 200, description = "Response recorded"),
        (status = 400, description = "Invalid response value"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Invitation belongs to a different user"),
        (status = 404, description = "Invitation not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "containers",
)]
pub async fn respond_to_sharing_invitation(
    Path(invitation_id): Path<Uuid>,
    _csrf: CsrfProtected,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
    Json(body): Json<SharingRespondBody>,
) -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    state
        .container_service
        .respond_to_invitation(&actor, invitation_id, body.response)
        .await?;
    Ok(Json(ApiResponse::new("ok")))
}
