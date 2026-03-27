//! Centralized authentication resolver.
//!
//! All inbound requests are authenticated through a single ordered chain:
//!
//! 1. **Session cookie** (`__Host-hzel_session`) → `AuthMethod::Session`
//! 2. **Bearer token** (`Authorization: Bearer <token>` or `?token=` query param):
//!    - Starts with `"hzel_"` → PAT lookup by SHA-256 hash → `AuthMethod::Pat`
//!    - Otherwise → JWT validation → `AuthMethod::Oidc`
//!
//! Adding a new auth method means adding a branch here only; all extractors and
//! WebSocket handlers delegate to this function automatically.

use axum::http::HeaderMap;
use chrono::Utc;
use sha2::{Digest, Sha256};

use crate::{
    app_state::AppState,
    auth::context::{AuthenticatedSession, AuthenticatedUser},
    models::session::AuthMethod,
    utils::error::ApiError,
};

/// The token prefix that identifies a personal access token.
pub const PAT_PREFIX: &str = "hzel_";

/// Hashes a raw PAT value using SHA-256, returning a lowercase hex string.
pub fn hash_pat(token: &str) -> String {
    let digest = Sha256::digest(token.as_bytes());
    digest.iter().map(|b| format!("{:02x}", b)).collect()
}

/// Resolves an authenticated user from the request headers.
///
/// `bearer_override` is used by WebSocket handlers that carry the token in
/// a query parameter (`?token=…`) rather than an `Authorization` header.
pub async fn resolve_authenticated_user(
    headers: &HeaderMap,
    bearer_override: Option<&str>,
    state: &AppState,
) -> Result<AuthenticatedUser, ApiError> {
    // ── 1. Session cookie ────────────────────────────────────────────────────
    if let Ok(session) = state.session_service.authenticate_headers(headers).await {
        return Ok(session.user);
    }

    // ── 2. Bearer token (header or query-param override) ─────────────────────
    let raw_token = bearer_override.map(str::to_owned).or_else(|| {
        headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .map(str::to_owned)
    });

    let token = raw_token.ok_or_else(ApiError::unauthorized)?;

    if token.starts_with(PAT_PREFIX) {
        resolve_pat(&token, state).await
    } else {
        resolve_jwt(&token, state).await
    }
}

/// Resolves an `AuthenticatedSession` (cookie-only, no JWT/PAT fallback).
pub async fn resolve_authenticated_session(
    headers: &HeaderMap,
    state: &AppState,
) -> Result<AuthenticatedSession, ApiError> {
    state.session_service.authenticate_headers(headers).await
}

// ── Private helpers ──────────────────────────────────────────────────────────

async fn resolve_pat(token: &str, state: &AppState) -> Result<AuthenticatedUser, ApiError> {
    let hash = hash_pat(token);

    let record = state
        .api_token_repo
        .find_by_hash(&hash)
        .await?
        .ok_or_else(ApiError::unauthorized)?;

    // Reject revoked tokens.
    if record.revoked_at.is_some() {
        return Err(ApiError::unauthorized());
    }

    // Reject expired tokens.
    if let Some(expires_at) = record.expires_at {
        if expires_at <= Utc::now() {
            return Err(ApiError::unauthorized());
        }
    }

    // Fetch the owning user.
    let user = state
        .user_repo
        .get(record.user_id)
        .await?
        .ok_or_else(ApiError::unauthorized)?;

    // Update last_used_at without blocking the response.
    let repo = state.api_token_repo.clone();
    let token_id = record.id;
    tokio::spawn(async move {
        let _ = repo.touch(token_id).await;
    });

    Ok(AuthenticatedUser {
        user_id: user.id,
        session_id: None,
        email: user.email,
        role: user.role,
        auth_method: AuthMethod::Pat,
        authenticated_at: Utc::now(),
        oauth_scopes: None,
    })
}

async fn resolve_jwt(token: &str, state: &AppState) -> Result<AuthenticatedUser, ApiError> {
    let claims = state.jwt_service.validate_access_token(token)?;

    let user_id = uuid::Uuid::parse_str(&claims.sub).map_err(|_| ApiError::unauthorized())?;

    let user = state
        .user_repo
        .get(user_id)
        .await?
        .ok_or_else(ApiError::unauthorized)?;

    // Dispatch on token type: OAuth tokens carry a client_id; OIDC tokens carry a session_id.
    if let Some(client_id) = claims.client_id {
        Ok(AuthenticatedUser {
            user_id: user.id,
            session_id: None,
            email: user.email,
            role: user.role,
            auth_method: AuthMethod::Oauth,
            authenticated_at: Utc::now(),
            oauth_scopes: Some(claims.scopes),
        })
    } else {
        let session_id = claims
            .session_id
            .as_deref()
            .and_then(|s| uuid::Uuid::parse_str(s).ok())
            .ok_or_else(ApiError::unauthorized)?;

        Ok(AuthenticatedUser {
            user_id: user.id,
            session_id: Some(session_id),
            email: user.email,
            role: user.role,
            auth_method: AuthMethod::Oidc,
            authenticated_at: Utc::now(),
            oauth_scopes: None,
        })
    }
}

