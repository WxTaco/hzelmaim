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
/// and redirects to frontend with JWT tokens in URL.
pub async fn oidc_callback(
    State(state): State<AppState>,
    Query(params): Query<OidcCallbackParams>,
) -> Result<Redirect, ApiError> {
    let oidc = state
        .oidc_service
        .as_ref()
        .ok_or_else(|| ApiError::not_implemented("OIDC is not enabled"))?;

    let session = oidc.handle_callback(&params.code, &params.state).await?;

    // Fetch user to get email
    let user = state
        .user_repo
        .get(session.user_id)
        .await?
        .ok_or_else(|| ApiError::unauthorized())?;

    // Generate JWT tokens
    let access_token = state.jwt_service.generate_access_token(
        session.user_id,
        user.email.clone(),
        session.id,
    )?;

    let refresh_token = state.jwt_service.generate_refresh_token(session.user_id, session.id)?;

    // Redirect to frontend callback handler with tokens in URL
    let callback_url = format!(
        "{}/auth/callback?access_token={}&refresh_token={}",
        state.config.public_base_url.trim_end_matches('/'),
        urlencoding::encode(&access_token),
        urlencoding::encode(&refresh_token),
    );

    Ok(Redirect::to(&callback_url))
}

/// Refresh token endpoint - exchanges a refresh token for a new access token.
#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

pub async fn refresh_token(
    State(state): State<AppState>,
    Json(body): Json<RefreshTokenRequest>,
) -> Result<Json<ApiResponse<TokenResponse>>, ApiError> {
    let claims = state.jwt_service.validate_refresh_token(&body.refresh_token)?;

    // Get user from database to verify they still exist and are active
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| ApiError::unauthorized())?;
    let session_id = uuid::Uuid::parse_str(&claims.session_id)
        .map_err(|_| ApiError::unauthorized())?;

    // Fetch user to get email
    let user = state
        .user_repo
        .get(user_id)
        .await?
        .ok_or_else(|| ApiError::unauthorized())?;

    // Generate new access token
    let access_token = state.jwt_service.generate_access_token(
        user_id,
        user.email,
        session_id,
    )?;

    Ok(Json(ApiResponse::new(TokenResponse {
        access_token,
        refresh_token: body.refresh_token, // Return the same refresh token
        token_type: "Bearer".to_string(),
        expires_in: 900, // 15 minutes
    })))
}

/// Get current authenticated user info.
pub async fn me(user: AuthenticatedUser) -> Json<ApiResponse<UserInfoResponse>> {
    Json(ApiResponse::new(UserInfoResponse {
        user_id: user.user_id.to_string(),
        email: user.email,
        role: user.role,
        auth_method: user.auth_method,
    }))
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

/// JWT token response for cross-domain authentication.
#[derive(Debug, Clone, Serialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

/// Current user information response.
#[derive(Debug, Clone, Serialize)]
pub struct UserInfoResponse {
    pub user_id: String,
    pub email: String,
    pub role: crate::models::user::UserRole,
    pub auth_method: AuthMethod,
}
