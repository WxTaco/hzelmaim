//! Request-scoped authentication context and authorization helpers.

use chrono::{DateTime, Utc};
use axum::{extract::FromRequestParts, http::request::Parts};
use serde::Serialize;
use uuid::Uuid;

use crate::{app_state::AppState, models::{session::AuthMethod, user::UserRole}, utils::error::ApiError};

/// Authenticated actor attached to requests by the session layer.
#[derive(Debug, Clone, Serialize)]
pub struct AuthenticatedUser {
    pub user_id: Uuid,
    pub session_id: Uuid,
    pub email: String,
    pub role: UserRole,
    pub auth_method: AuthMethod,
    pub authenticated_at: DateTime<Utc>,
}

/// Authenticated session context derived from a request cookie.
#[derive(Debug, Clone, Serialize)]
pub struct AuthenticatedSession {
    pub user: AuthenticatedUser,
    pub csrf_token: String,
    pub expires_at: DateTime<Utc>,
}

impl AuthenticatedUser {
    /// Ensures the current actor may access a tenant-owned resource.
    pub fn require_container_access(&self, owner_user_id: Uuid) -> Result<(), ApiError> {
        if self.role == UserRole::Admin || self.user_id == owner_user_id {
            Ok(())
        } else {
            Err(ApiError::forbidden("You do not have access to this container"))
        }
    }
}

impl FromRequestParts<AppState> for AuthenticatedSession {
    type Rejection = ApiError;

    /// Resolves session context from the configured session cookie.
    fn from_request_parts(parts: &mut Parts, state: &AppState) -> impl std::future::Future<Output = Result<Self, Self::Rejection>> + Send {
        let session_from_extensions = parts.extensions.get::<AuthenticatedSession>().cloned();
        let session_service = state.session_service.clone();
        let headers = parts.headers.clone();

        async move {
            match session_from_extensions {
                Some(session) => Ok(session),
                None => session_service.authenticate_headers(&headers).await,
            }
        }
    }
}

impl FromRequestParts<AppState> for AuthenticatedUser {
    type Rejection = ApiError;

    /// Resolves the authenticated actor from either:
    /// 1. Request extensions (from middleware)
    /// 2. Session cookie (legacy)
    /// 3. JWT token in Authorization header (cross-domain)
    fn from_request_parts(parts: &mut Parts, state: &AppState) -> impl std::future::Future<Output = Result<Self, Self::Rejection>> + Send {
        let session_from_extensions = parts.extensions.get::<AuthenticatedSession>().cloned();
        let session_service = state.session_service.clone();
        let jwt_service = state.jwt_service.clone();
        let user_repo = state.user_repo.clone();
        let headers = parts.headers.clone();

        async move {
            // Try to get from extensions first (set by middleware)
            if let Some(session) = session_from_extensions {
                return Ok(session.user);
            }

            // Try session cookie authentication
            if let Ok(session) = session_service.authenticate_headers(&headers).await {
                return Ok(session.user);
            }

            // Try JWT token authentication from Authorization header
            authenticate_jwt(&headers, &jwt_service, &user_repo).await
        }
    }
}

/// Extracts and validates JWT token from Authorization header.
async fn authenticate_jwt(
    headers: &axum::http::HeaderMap,
    jwt_service: &crate::auth::jwt::JwtService,
    user_repo: &std::sync::Arc<dyn crate::db::user_repo::UserRepo>,
) -> Result<AuthenticatedUser, ApiError> {
    // Extract token from Authorization header
    let auth_header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or_else(ApiError::unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(ApiError::unauthorized)?;

    // Validate JWT token
    let claims = jwt_service.validate_access_token(token)?;

    // Parse user_id from claims
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| ApiError::unauthorized())?;

    // Fetch user from database
    let user = user_repo
        .get(user_id)
        .await?
        .ok_or_else(ApiError::unauthorized)?;

    // Create authenticated user from JWT claims
    Ok(AuthenticatedUser {
        user_id,
        session_id: uuid::Uuid::parse_str(&claims.session_id)
            .map_err(|_| ApiError::unauthorized())?,
        email: user.email,
        role: user.role,
        auth_method: crate::models::session::AuthMethod::Oidc,
        authenticated_at: chrono::Utc::now(),
    })
}
