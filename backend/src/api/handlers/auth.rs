//! Authentication-related HTTP handlers.

use axum::{
    extract::{Path, Query, State},
    response::Redirect,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    api::response::ApiResponse,
    app_state::AppState,
    auth::{
        context::{AuthenticatedSession, AuthenticatedUser},
        csrf::CsrfProtected,
        resolver::hash_pat,
        session::SessionConfig,
    },
    models::{api_token::ApiTokenView, session::AuthMethod},
    utils::error::ApiError,
};

/// Lightweight health endpoint for orchestration systems.
pub async fn health() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::new("ok"))
}

/// Placeholder login endpoint reserved for future OIDC and session bootstrap.
pub async fn login() -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    Err(ApiError::not_implemented(
        "Use /api/v1/auth/oidc/authorize for login",
    ))
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
        user.display_name.clone(),
        user.picture_url.clone(),
        user.role.to_string().to_lowercase(),
        session.id,
    )?;

    let refresh_token = state
        .jwt_service
        .generate_refresh_token(session.user_id, session.id)?;

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
    let claims = state
        .jwt_service
        .validate_refresh_token(&body.refresh_token)?;

    // Get user from database to verify they still exist and are active
    let user_id = uuid::Uuid::parse_str(&claims.sub).map_err(|_| ApiError::unauthorized())?;
    let session_id =
        uuid::Uuid::parse_str(&claims.session_id).map_err(|_| ApiError::unauthorized())?;

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
        user.display_name,
        user.picture_url,
        user.role.to_string().to_lowercase(),
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
pub async fn logout(
    _csrf: CsrfProtected,
    State(state): State<AppState>,
    session: AuthenticatedSession,
) -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    let session_id = session.user.session_id.ok_or_else(ApiError::unauthorized)?;
    state.session_service.revoke_session(session_id).await?;
    Ok(Json(ApiResponse::new("logged_out")))
}

/// Returns the currently authenticated session context.
pub async fn session(
    State(state): State<AppState>,
    session: AuthenticatedSession,
) -> Json<ApiResponse<SessionView>> {
    let AuthenticatedSession {
        user,
        csrf_token,
        expires_at,
    } = session;

    Json(ApiResponse::new(SessionView {
        user: user.clone(),
        session: SessionDetails {
            session_id: user.session_id.unwrap_or_default(),
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

// ── Personal Access Token endpoints ────────────────────────────────────────

/// Request body for creating a new PAT.
#[derive(Debug, Deserialize)]
pub struct CreateTokenRequest {
    pub name: String,
    /// Optional expiry. `null` / omitted means the token never expires.
    pub expires_at: Option<DateTime<Utc>>,
}

/// Response returned once when a PAT is created (includes the raw token value).
#[derive(Debug, Serialize)]
pub struct CreateTokenResponse {
    /// The raw token value. Store it now — it is never shown again.
    pub token: String,
    #[serde(flatten)]
    pub view: ApiTokenView,
}

/// `POST /api/v1/tokens` — create a new personal access token.
pub async fn create_token(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Json(body): Json<CreateTokenRequest>,
) -> Result<Json<ApiResponse<CreateTokenResponse>>, ApiError> {
    use crate::auth::resolver::PAT_PREFIX;
    use crate::models::api_token::ApiTokenRecord;
    use rand::RngCore;

    // Generate 32 cryptographically random bytes and base64url-encode them.
    let mut raw_bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut raw_bytes);
    let suffix = base64_url_encode(&raw_bytes);
    let raw_token = format!("{PAT_PREFIX}{suffix}");

    let token_hash = hash_pat(&raw_token);
    // The display prefix is the first 16 chars (e.g. "hzel_AbCdEfGhIj…").
    let prefix = raw_token.chars().take(16).collect::<String>();

    let record = ApiTokenRecord {
        id: Uuid::new_v4(),
        user_id: user.user_id,
        name: body.name,
        token_hash,
        prefix,
        last_used_at: None,
        expires_at: body.expires_at,
        created_at: Utc::now(),
        revoked_at: None,
    };

    state.api_token_repo.create(&record).await?;

    let response = CreateTokenResponse {
        token: raw_token,
        view: record.into(),
    };

    Ok(Json(ApiResponse::new(response)))
}

/// `GET /api/v1/tokens` — list all PATs belonging to the authenticated user.
pub async fn list_tokens(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<ApiResponse<Vec<ApiTokenView>>>, ApiError> {
    let records = state.api_token_repo.list_for_user(user.user_id).await?;
    let views: Vec<ApiTokenView> = records.into_iter().map(Into::into).collect();
    Ok(Json(ApiResponse::new(views)))
}

/// `DELETE /api/v1/tokens/:id` — revoke one of the authenticated user's PATs.
pub async fn revoke_token(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(token_id): Path<Uuid>,
) -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    let revoked = state
        .api_token_repo
        .revoke(token_id, user.user_id)
        .await?;

    if revoked {
        Ok(Json(ApiResponse::new("revoked")))
    } else {
        Err(ApiError::not_found("Token not found or already revoked"))
    }
}

/// URL-safe base64 encoding without padding.
fn base64_url_encode(bytes: &[u8]) -> String {
    // Simple base64url: use the standard alphabet substituting +→- and /→_,
    // then strip trailing `=` padding.
    let b64 = base64_standard(bytes);
    b64.replace('+', "-").replace('/', "_").replace('=', "")
}

fn base64_standard(bytes: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = if chunk.len() > 1 { chunk[1] as usize } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as usize } else { 0 };
        out.push(CHARS[b0 >> 2] as char);
        out.push(CHARS[((b0 & 3) << 4) | (b1 >> 4)] as char);
        if chunk.len() > 1 {
            out.push(CHARS[((b1 & 0xf) << 2) | (b2 >> 6)] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(CHARS[b2 & 0x3f] as char);
        } else {
            out.push('=');
        }
    }
    out
}
