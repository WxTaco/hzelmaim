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

    /// Resolves the authenticated actor from the request session cookie.
    fn from_request_parts(parts: &mut Parts, state: &AppState) -> impl std::future::Future<Output = Result<Self, Self::Rejection>> + Send {
        let session_from_extensions = parts.extensions.get::<AuthenticatedSession>().cloned();
        let session_service = state.session_service.clone();
        let headers = parts.headers.clone();

        async move {
            match session_from_extensions {
                Some(session) => Ok(session.user),
                None => Ok(session_service.authenticate_headers(&headers).await?.user),
            }
        }
    }
}
