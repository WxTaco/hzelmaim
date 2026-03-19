//! Audit log handlers.

use axum::Json;

use crate::{
    api::response::ApiResponse,
    auth::context::AuthenticatedUser,
    models::{audit::AuditLogRecord, user::UserRole},
    utils::error::ApiError,
};

/// Returns audit logs to administrators only.
pub async fn list(
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<Vec<AuditLogRecord>>>, ApiError> {
    if actor.role != UserRole::Admin {
        return Err(ApiError::forbidden(
            "Only administrators may view audit logs",
        ));
    }
    Ok(Json(ApiResponse::new(Vec::new())))
}
