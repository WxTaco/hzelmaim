//! Authentication-related HTTP handlers.

use axum::{extract::State, Json};
use chrono::{DateTime, Utc};
use serde::Serialize;

use crate::{api::response::ApiResponse, app_state::AppState, auth::{context::{AuthenticatedSession, AuthenticatedUser}, csrf::CsrfProtected, session::SessionConfig}, models::session::AuthMethod, utils::error::ApiError};

/// Lightweight health endpoint for orchestration systems.
pub async fn health() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::new("ok"))
}

/// Placeholder login endpoint reserved for future OIDC and session bootstrap.
pub async fn login() -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    Err(ApiError::not_implemented("OIDC login flow is not implemented in the initial scaffold"))
}

/// Session logout endpoint.
pub async fn logout(_csrf: CsrfProtected, State(state): State<AppState>, session: AuthenticatedSession) -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    state.session_service.revoke_session(session.user.session_id).await?;
    Ok(Json(ApiResponse::new("logged_out")))
}

/// Returns the currently authenticated session context.
pub async fn session(State(state): State<AppState>, session: AuthenticatedSession) -> Json<ApiResponse<SessionView>> {
    let AuthenticatedSession { user, csrf_token, expires_at } = session;

    Json(ApiResponse::new(SessionView {
        user: user.clone(),
        session: SessionDetails {
            session_id: user.session_id,
            csrf_token,
            expires_at,
            auth_method: user.auth_method,
        },
        policy: state.session_service.config().clone(),
        oidc_enabled: state.config.oidc_enabled,
    }))
}

/// Read-only session information for frontend bootstrap.
#[derive(Debug, Clone, Serialize)]
pub struct SessionView {
    pub user: AuthenticatedUser,
    pub session: SessionDetails,
    pub policy: SessionConfig,
    pub oidc_enabled: bool,
}

/// Concrete session metadata returned to authenticated clients.
#[derive(Debug, Clone, Serialize)]
pub struct SessionDetails {
    pub session_id: uuid::Uuid,
    pub csrf_token: String,
    pub expires_at: DateTime<Utc>,
    pub auth_method: AuthMethod,
}
