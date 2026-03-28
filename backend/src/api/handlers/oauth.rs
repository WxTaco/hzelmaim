//! OAuth 2.0 application management and authorization code flow handlers.

use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{Duration, Utc};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{
    api::response::ApiResponse,
    app_state::AppState,
    auth::context::AuthenticatedUser,
    models::oauth::{
        OAuthAppPublicView, OAuthApplication, OAuthApplicationView, OAuthAuthorizationCode,
        OAuthRefreshToken,
    },
    utils::error::ApiError,
};

// ── Shared helpers ────────────────────────────────────────────────────────────

/// Hashes an arbitrary secret value using SHA-256, returning a lowercase hex string.
fn sha256_hex(value: &str) -> String {
    let digest = Sha256::digest(value.as_bytes());
    digest.iter().map(|b| format!("{:02x}", b)).collect()
}

/// Generates `n` cryptographically random bytes and encodes them as base64url (no padding).
fn random_base64url(n: usize) -> String {
    let mut bytes = vec![0u8; n];
    rand::rng().fill_bytes(&mut bytes);
    base64url_encode(&bytes)
}

/// URL-safe base64 encoding without padding (mirrors the helper in auth handlers).
fn base64url_encode(bytes: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = if chunk.len() > 1 { chunk[1] as usize } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as usize } else { 0 };
        out.push(CHARS[b0 >> 2] as char);
        out.push(CHARS[((b0 & 3) << 4) | (b1 >> 4)] as char);
        if chunk.len() > 1 { out.push(CHARS[((b1 & 0xf) << 2) | (b2 >> 6)] as char); }
        if chunk.len() > 2 { out.push(CHARS[b2 & 0x3f] as char); }
    }
    out.replace('+', "-").replace('/', "_")
}

/// Checks that the requesting user owns `app`, returning 404 if the app does
/// not belong to them (we intentionally don't leak existence to non-owners).
fn require_owner(app: &OAuthApplication, actor: &AuthenticatedUser) -> Result<(), ApiError> {
    if app.owner_user_id != actor.user_id {
        return Err(ApiError::not_found("OAuth application not found"));
    }
    Ok(())
}

// ── Request / response types ──────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateAppRequest {
    pub name: String,
    pub description: Option<String>,
    pub redirect_uris: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateAppResponse {
    /// The raw client secret — shown only once at creation time.
    pub client_secret: String,
    #[serde(flatten)]
    pub app: OAuthApplicationView,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAppRequest {
    pub name: String,
    pub description: Option<String>,
    pub redirect_uris: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct RotateSecretResponse {
    /// New raw client secret — shown only once.
    pub client_secret: String,
}

// ── App management handlers ───────────────────────────────────────────────────

/// `POST /api/v1/oauth/apps` — register a new OAuth application.
pub async fn create_app(
    State(state): State<AppState>,
    actor: AuthenticatedUser,
    Json(body): Json<CreateAppRequest>,
) -> Result<Json<ApiResponse<CreateAppResponse>>, ApiError> {
    if body.name.trim().is_empty() {
        return Err(ApiError::validation("Application name must not be empty"));
    }
    if body.redirect_uris.is_empty() {
        return Err(ApiError::validation(
            "At least one redirect URI is required",
        ));
    }

    let raw_secret = format!("hzcs_{}", random_base64url(32));
    let secret_hash = sha256_hex(&raw_secret);
    let secret_prefix = raw_secret.chars().take(12).collect::<String>();

    let app = OAuthApplication {
        id: Uuid::new_v4(),
        owner_user_id: actor.user_id,
        name: body.name,
        description: body.description,
        client_id: Uuid::new_v4(),
        client_secret_hash: secret_hash,
        client_secret_prefix: secret_prefix,
        redirect_uris: body.redirect_uris,
        created_at: Utc::now(),
        revoked_at: None,
    };

    state.oauth_app_repo.create(&app).await?;

    Ok(Json(ApiResponse::new(CreateAppResponse {
        client_secret: raw_secret,
        app: app.into(),
    })))
}

/// `GET /api/v1/oauth/apps` — list the authenticated user's OAuth applications.
pub async fn list_apps(
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<Vec<OAuthApplicationView>>>, ApiError> {
    let apps = state.oauth_app_repo.list_for_user(actor.user_id).await?;
    let views: Vec<OAuthApplicationView> = apps.into_iter().map(Into::into).collect();
    Ok(Json(ApiResponse::new(views)))
}

/// `GET /api/v1/oauth/apps/:id` — fetch one of the authenticated user's apps.
pub async fn get_app(
    Path(app_id): Path<Uuid>,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<OAuthApplicationView>>, ApiError> {
    let app = state
        .oauth_app_repo
        .get(app_id)
        .await?
        .ok_or_else(|| ApiError::not_found("OAuth application not found"))?;
    require_owner(&app, &actor)?;
    Ok(Json(ApiResponse::new(OAuthApplicationView::from(app))))
}


/// `PATCH /api/v1/oauth/apps/:id` — update name, description, or redirect URIs.
pub async fn update_app(
    Path(app_id): Path<Uuid>,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
    Json(body): Json<UpdateAppRequest>,
) -> Result<Json<ApiResponse<OAuthApplicationView>>, ApiError> {
    if body.name.trim().is_empty() {
        return Err(ApiError::validation("Application name must not be empty"));
    }
    if body.redirect_uris.is_empty() {
        return Err(ApiError::validation("At least one redirect URI is required"));
    }
    let app = state
        .oauth_app_repo
        .get(app_id)
        .await?
        .ok_or_else(|| ApiError::not_found("OAuth application not found"))?;
    require_owner(&app, &actor)?;
    state
        .oauth_app_repo
        .update(app_id, &body.name, body.description.as_deref(), &body.redirect_uris)
        .await?;
    let updated = state
        .oauth_app_repo
        .get(app_id)
        .await?
        .ok_or_else(|| ApiError::internal("app disappeared after update"))?;
    Ok(Json(ApiResponse::new(OAuthApplicationView::from(updated))))
}

/// `DELETE /api/v1/oauth/apps/:id` — soft-delete an app and revoke all its tokens.
pub async fn delete_app(
    Path(app_id): Path<Uuid>,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    let app = state
        .oauth_app_repo
        .get(app_id)
        .await?
        .ok_or_else(|| ApiError::not_found("OAuth application not found"))?;
    require_owner(&app, &actor)?;
    state.oauth_app_repo.revoke(app_id).await?;
    Ok(Json(ApiResponse::new("deleted")))
}

/// `POST /api/v1/oauth/apps/:id/secret` — rotate the client secret.
///
/// All existing refresh tokens for the app are revoked because they were issued
/// using the old secret and can no longer be refreshed once the secret changes.
pub async fn rotate_secret(
    Path(app_id): Path<Uuid>,
    State(state): State<AppState>,
    actor: AuthenticatedUser,
) -> Result<Json<ApiResponse<RotateSecretResponse>>, ApiError> {
    let app = state
        .oauth_app_repo
        .get(app_id)
        .await?
        .ok_or_else(|| ApiError::not_found("OAuth application not found"))?;
    require_owner(&app, &actor)?;

    let raw_secret = format!("hzcs_{}", random_base64url(32));
    let secret_hash = sha256_hex(&raw_secret);
    let secret_prefix = raw_secret.chars().take(12).collect::<String>();

    state
        .oauth_app_repo
        .rotate_secret(app_id, &secret_hash, &secret_prefix)
        .await?;
    state.oauth_token_repo.revoke_all_for_app(app_id).await?;

    Ok(Json(ApiResponse::new(RotateSecretResponse {
        client_secret: raw_secret,
    })))
}

/// `GET /api/v1/oauth/apps/public/:client_id` — unauthenticated public app info
/// returned to the consent page so it can display the app's name and owner.
pub async fn public_app_info(
    Path(client_id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<OAuthAppPublicView>>, ApiError> {
    let app = state
        .oauth_app_repo
        .find_by_client_id(client_id)
        .await?
        .ok_or_else(|| ApiError::not_found("OAuth application not found"))?;
    if app.revoked_at.is_some() {
        return Err(ApiError::not_found("OAuth application not found"));
    }
    let owner = state
        .user_repo
        .get(app.owner_user_id)
        .await?
        .ok_or_else(|| ApiError::internal("owner user not found"))?;
    let owner_name = owner
        .display_name
        .unwrap_or_else(|| owner.email.clone());
    Ok(Json(ApiResponse::new(OAuthAppPublicView {
        client_id: app.client_id,
        name: app.name,
        description: app.description,
        owner_name,
    })))
}

// ── OAuth 2.0 Authorization Code Flow ────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct AuthorizeParams {
    pub client_id: Uuid,
    pub redirect_uri: String,
    pub response_type: String,
    pub state: String,
}

#[derive(Debug, Deserialize)]
pub struct AuthorizeBody {
    pub client_id: Uuid,
    pub redirect_uri: String,
    pub state: String,
    pub approved: bool,
}

#[derive(Debug, Serialize)]
pub struct AuthorizeResponse {
    /// The URL the frontend should navigate the browser to.
    pub redirect_url: String,
}

/// `GET /api/v1/oauth/authorize` — validates client parameters and returns the
/// URL the frontend should redirect the browser to (the consent page).
///
/// No authentication required — the client app drives the browser here first.
pub async fn authorize_get(
    State(state): State<AppState>,
    Query(params): Query<AuthorizeParams>,
) -> Result<Json<ApiResponse<AuthorizeResponse>>, ApiError> {
    validate_authorize_params(&state, &params).await?;
    // Redirect the browser to the frontend consent page, carrying all params.
    let consent_url = format!(
        "{}/oauth/consent?client_id={}&redirect_uri={}&state={}&response_type={}",
        state.config.public_base_url.trim_end_matches('/'),
        params.client_id,
        urlencoding::encode(&params.redirect_uri),
        urlencoding::encode(&params.state),
        urlencoding::encode(&params.response_type),
    );
    Ok(Json(ApiResponse::new(AuthorizeResponse {
        redirect_url: consent_url,
    })))
}

/// `POST /api/v1/oauth/authorize` — the user approves or denies consent.
///
/// Returns the URL the frontend should navigate the browser to. On approval this
/// is `redirect_uri?code=...&state=...`; on denial it is
/// `redirect_uri?error=access_denied&state=...`.
pub async fn authorize_post(
    State(state): State<AppState>,
    actor: AuthenticatedUser,
    Json(body): Json<AuthorizeBody>,
) -> Result<Json<ApiResponse<AuthorizeResponse>>, ApiError> {
    let params = AuthorizeParams {
        client_id: body.client_id,
        redirect_uri: body.redirect_uri.clone(),
        response_type: "code".into(),
        state: body.state.clone(),
    };
    let app = validate_authorize_params(&state, &params).await?;

    if !body.approved {
        let url = format!(
            "{}?error=access_denied&state={}",
            body.redirect_uri,
            urlencoding::encode(&body.state),
        );
        return Ok(Json(ApiResponse::new(AuthorizeResponse { redirect_url: url })));
    }

    // Generate a short-lived single-use authorization code.
    let raw_code = random_base64url(24);
    let code_hash = sha256_hex(&raw_code);

    let code = OAuthAuthorizationCode {
        id: Uuid::new_v4(),
        app_id: app.id,
        user_id: actor.user_id,
        code_hash,
        redirect_uri: body.redirect_uri.clone(),
        expires_at: Utc::now() + Duration::minutes(10),
        used_at: None,
    };
    state.oauth_code_repo.create(&code).await?;

    let url = format!(
        "{}?code={}&state={}",
        body.redirect_uri,
        urlencoding::encode(&raw_code),
        urlencoding::encode(&body.state),
    );
    Ok(Json(ApiResponse::new(AuthorizeResponse { redirect_url: url })))
}

/// Validates the common parameters for both authorize endpoints.
/// Returns the resolved `OAuthApplication` on success.
async fn validate_authorize_params(
    state: &AppState,
    params: &AuthorizeParams,
) -> Result<OAuthApplication, ApiError> {
    if params.response_type != "code" {
        return Err(ApiError::validation(
            "response_type must be \"code\"",
        ));
    }
    let app = state
        .oauth_app_repo
        .find_by_client_id(params.client_id)
        .await?
        .ok_or_else(|| ApiError::not_found("OAuth application not found"))?;
    if app.revoked_at.is_some() {
        return Err(ApiError::not_found("OAuth application not found"));
    }
    if !app.redirect_uris.contains(&params.redirect_uri) {
        return Err(ApiError::validation(
            "redirect_uri does not match any registered URI for this application",
        ));
    }
    Ok(app)
}

// ── Token endpoint ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct TokenRequest {
    pub grant_type: String,
    /// Required for authorization_code grant.
    pub code: Option<String>,
    /// Required for authorization_code grant.
    pub redirect_uri: Option<String>,
    /// Required for refresh_token grant.
    pub refresh_token: Option<String>,
    pub client_id: Uuid,
    pub client_secret: String,
}

#[derive(Debug, Serialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: &'static str,
    pub expires_in: i64,
    pub refresh_token: String,
}

/// `POST /api/v1/oauth/token` — exchange an authorization code or refresh token
/// for a new access token + refresh token pair.
pub async fn token(
    State(state): State<AppState>,
    Json(body): Json<TokenRequest>,
) -> Result<Json<TokenResponse>, ApiError> {
    // Authenticate the client application.
    let app = state
        .oauth_app_repo
        .find_by_client_id(body.client_id)
        .await?
        .ok_or_else(ApiError::unauthorized)?;
    if app.revoked_at.is_some() {
        return Err(ApiError::unauthorized());
    }
    if sha256_hex(&body.client_secret) != app.client_secret_hash {
        return Err(ApiError::unauthorized());
    }

    let (user_id, new_refresh_token) = match body.grant_type.as_str() {
        "authorization_code" => {
            let raw_code = body.code.ok_or_else(|| {
                ApiError::validation("\"code\" is required for authorization_code grant")
            })?;
            let redirect_uri = body.redirect_uri.ok_or_else(|| {
                ApiError::validation("\"redirect_uri\" is required for authorization_code grant")
            })?;
            let code_hash = sha256_hex(&raw_code);
            let code = state
                .oauth_code_repo
                .consume(&code_hash)
                .await?
                .ok_or_else(|| {
                    ApiError::validation("authorization code is invalid, expired, or already used")
                })?;
            if code.app_id != app.id {
                return Err(ApiError::unauthorized());
            }
            if code.redirect_uri != redirect_uri {
                return Err(ApiError::validation(
                    "redirect_uri does not match the one used during authorization",
                ));
            }
            let raw_token = issue_refresh_token(&state, app.id, code.user_id).await?;
            (code.user_id, raw_token)
        }
        "refresh_token" => {
            let raw_rt = body.refresh_token.ok_or_else(|| {
                ApiError::validation("\"refresh_token\" is required for refresh_token grant")
            })?;
            let hash = sha256_hex(&raw_rt);
            let rt = state
                .oauth_token_repo
                .find_by_hash(&hash)
                .await?
                .ok_or_else(ApiError::unauthorized)?;
            if rt.revoked_at.is_some() || rt.app_id != app.id {
                return Err(ApiError::unauthorized());
            }
            // Rotate: revoke the old token and issue a fresh one.
            state.oauth_token_repo.revoke(rt.id).await?;
            let raw_token = issue_refresh_token(&state, app.id, rt.user_id).await?;
            (rt.user_id, raw_token)
        }
        other => {
            return Err(ApiError::validation(format!(
                "unsupported grant_type \"{other}\""
            )));
        }
    };

    let user = state
        .user_repo
        .get(user_id)
        .await?
        .ok_or_else(ApiError::unauthorized)?;

    let access_token = state.jwt_service.generate_oauth_access_token(
        user.id,
        user.email,
        user.role.to_string().to_lowercase(),
        app.client_id.to_string(),
        vec![],
    )?;

    Ok(Json(TokenResponse {
        access_token,
        token_type: "Bearer",
        expires_in: 900,
        refresh_token: new_refresh_token,
    }))
}

/// Generates and persists a new OAuth refresh token, returning the raw value.
async fn issue_refresh_token(
    state: &AppState,
    app_id: Uuid,
    user_id: Uuid,
) -> Result<String, ApiError> {
    let raw = format!("hzrt_{}", random_base64url(32));
    let token = OAuthRefreshToken {
        id: Uuid::new_v4(),
        app_id,
        user_id,
        token_hash: sha256_hex(&raw),
        created_at: Utc::now(),
        last_used_at: None,
        revoked_at: None,
    };
    state.oauth_token_repo.create(&token).await?;
    Ok(raw)
}

// ── Revoke endpoint ───────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RevokeRequest {
    pub refresh_token: String,
    pub client_id: Uuid,
    pub client_secret: String,
}

/// `POST /api/v1/oauth/token/revoke` — revoke a refresh token.
pub async fn revoke(
    State(state): State<AppState>,
    Json(body): Json<RevokeRequest>,
) -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    let app = state
        .oauth_app_repo
        .find_by_client_id(body.client_id)
        .await?
        .ok_or_else(ApiError::unauthorized)?;
    if sha256_hex(&body.client_secret) != app.client_secret_hash {
        return Err(ApiError::unauthorized());
    }
    let hash = sha256_hex(&body.refresh_token);
    if let Some(rt) = state.oauth_token_repo.find_by_hash(&hash).await? {
        if rt.app_id == app.id && rt.revoked_at.is_none() {
            state.oauth_token_repo.revoke(rt.id).await?;
        }
    }
    // Always return success — per RFC 7009 revocation is idempotent.
    Ok(Json(ApiResponse::new("revoked")))
}
