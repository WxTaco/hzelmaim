//! Authentication-related HTTP handlers.

use axum::{
    extract::{Query, State},
    http::{header, StatusCode},
    response::{IntoResponse, Redirect, Response},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::{
    api::response::ApiResponse,
    app_state::AppState,
    auth::{
        context::{AuthenticatedSession, AuthenticatedUser},
        csrf::CsrfProtected,
        session::SessionConfig,
    },
    models::session::AuthMethod,
    utils::error::ApiError,
};

/// Lightweight health endpoint for orchestration systems.
pub async fn health() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::new("ok"))
}

/// Placeholder login endpoint reserved for future OIDC and session bootstrap.
pub async fn login() -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    Err(ApiError::not_implemented("Use /api/v1/auth/oidc/authorize for login"))
}

/// Redirects the user agent to the OIDC provider's authorization endpoint.
pub async fn oidc_authorize(State(state): State<AppState>) -> Result<Redirect, ApiError> {
    let oidc = state
        .oidc_service
        .as_ref()
        .ok_or_else(|| ApiError::not_implemented("OIDC is not enabled"))?;

    let url = oidc.authorize_url().await;
    Ok(Redirect::to(&url))
}

/// Query parameters returned by the OIDC provider on the callback redirect.
#[derive(Debug, Deserialize)]
pub struct OidcCallbackParams {
    pub code: String,
    pub state: String,
}

/// Handles the OIDC provider callback, exchanges the code, creates a session,
/// and redirects to the frontend with a session cookie.
pub async fn oidc_callback(
    State(state): State<AppState>,
    Query(params): Query<OidcCallbackParams>,
) -> Result<Response, ApiError> {
    let oidc = state
        .oidc_service
        .as_ref()
        .ok_or_else(|| ApiError::not_implemented("OIDC is not enabled"))?;

    let session = oidc.handle_callback(&params.code, &params.state).await?;

    let cookie_name = &state.session_service.config().cookie_name;
    let max_age = state.session_service.config().max_age_seconds;
    let cookie = format!(
        "{}={}; Path=/; HttpOnly; SameSite=Lax; Max-Age={}",
        cookie_name, session.id, max_age
    );

    Ok(Response::builder()
        .status(StatusCode::TEMPORARY_REDIRECT)
        .header(header::LOCATION, "/")
        .header(header::SET_COOKIE, cookie)
        .body(axum::body::Body::empty())
        .unwrap()
        .into_response())
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
