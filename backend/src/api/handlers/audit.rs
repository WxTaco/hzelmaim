//! Audit log handlers.

use axum::Json;

use crate::{
    api::response::ApiResponse,
    auth::context::AuthenticatedUser,
    models::{audit::AuditLogRecord, user::UserRole},
    utils::error::ApiError,
};

/// Returns audit logs to administrators only.
///
/// OAuth application tokens are never permitted, even for admin accounts.
#[utoipa::path(
    get,
    path = "/api/v1/audit-logs",
    responses(
        (status = 200, description = "Audit log entries", body = inline(ApiResponse<Vec<AuditLogRecord>>)),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden — admin only"),
    ),
    security(("bearer_auth" = [])),
    tag = "audit",
)]
pub async fn list(
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<Vec<AuditLogRecord>>>, ApiError> {
    actor.require_not_oauth()?;
    if actor.role != UserRole::Admin {
        return Err(ApiError::forbidden(
            "Only administrators may view audit logs",
        ));
    }
    Ok(Json(ApiResponse::new(Vec::new())))
}
