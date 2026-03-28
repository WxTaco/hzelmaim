//! Request-scoped authentication context and authorization helpers.

use axum::{extract::FromRequestParts, http::request::Parts};
use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::{
    app_state::AppState,
    auth::resolver,
    models::{session::AuthMethod, user::UserRole},
    utils::error::ApiError,
};

/// Authenticated actor attached to requests by the session layer.
#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
pub struct AuthenticatedUser {
    pub user_id: Uuid,
    /// Present for session/OIDC auth; `None` for stateless PAT/OAuth authentication.
    pub session_id: Option<Uuid>,
    pub email: String,
    pub role: UserRole,
    pub auth_method: AuthMethod,
    pub authenticated_at: DateTime<Utc>,
    /// Scopes granted by the user to an OAuth application. `None` for non-OAuth auth methods.
    pub oauth_scopes: Option<Vec<String>>,
}

/// Authenticated session context derived from a request cookie.
#[derive(Debug, Clone, Serialize)]
pub struct AuthenticatedSession {
    pub user: AuthenticatedUser,
    pub csrf_token: String,
    pub expires_at: DateTime<Utc>,
}

impl AuthenticatedUser {
    /// Returns true when this request was authenticated via an OAuth application token.
    pub fn is_oauth(&self) -> bool {
        self.auth_method == AuthMethod::Oauth
    }

    /// Returns the role that should be used for access-control decisions.
    ///
    /// OAuth application tokens are intentionally downgraded to `User` even
    /// when the underlying account holds the `Admin` role. This prevents an
    /// OAuth app from gaining platform-wide admin access — it can only act on
    /// the authorizing user's own resources.
    pub fn effective_role(&self) -> &UserRole {
        if self.is_oauth() {
            &UserRole::User
        } else {
            &self.role
        }
    }

    /// Returns an error when the request was authenticated via an OAuth
    /// application token.
    ///
    /// Use this on endpoints that must never be reachable by OAuth apps
    /// regardless of the user's role (e.g. token management, audit logs).
    pub fn require_not_oauth(&self) -> Result<(), ApiError> {
        if self.is_oauth() {
            Err(ApiError::forbidden(
                "This endpoint is not accessible via OAuth application tokens",
            ))
        } else {
            Ok(())
        }
    }

    /// Ensures the current actor may access a tenant-owned resource.
    pub fn require_container_access(&self, owner_user_id: Uuid) -> Result<(), ApiError> {
        if self.role == UserRole::Admin || self.user_id == owner_user_id {
            Ok(())
        } else {
            Err(ApiError::forbidden(
                "You do not have access to this container",
            ))
        }
    }
}

impl FromRequestParts<AppState> for AuthenticatedSession {
    type Rejection = ApiError;

    /// Resolves session context from the configured session cookie.
    fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> impl std::future::Future<Output = Result<Self, Self::Rejection>> + Send {
        let cached = parts.extensions.get::<AuthenticatedSession>().cloned();
        let headers = parts.headers.clone();
        let state = state.clone();

        async move {
            match cached {
                Some(session) => Ok(session),
                None => resolver::resolve_authenticated_session(&headers, &state).await,
            }
        }
    }
}

impl FromRequestParts<AppState> for AuthenticatedUser {
    type Rejection = ApiError;

    /// Resolves the authenticated actor via the central auth resolver.
    ///
    /// Tries in order: cached session extension → session cookie → PAT → JWT.
    fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> impl std::future::Future<Output = Result<Self, Self::Rejection>> + Send {
        let cached = parts.extensions.get::<AuthenticatedSession>().cloned();
        let headers = parts.headers.clone();
        let state = state.clone();

        async move {
            if let Some(session) = cached {
                return Ok(session.user);
            }
            resolver::resolve_authenticated_user(&headers, None, &state).await
        }
    }
}
