//! Session and future OIDC integration configuration.

use std::sync::Arc;

use axum::http::HeaderMap;
use chrono::Utc;
use serde::Serialize;
use uuid::Uuid;

use crate::{
    auth::{
        context::{AuthenticatedSession, AuthenticatedUser},
        store::AuthStore,
    },
    models::user::{UserRole, UserStatus},
    utils::error::ApiError,
};

/// Session policy expected by the authentication subsystem.
#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
pub struct SessionConfig {
    pub cookie_name: String,
    pub secure_cookies: bool,
    pub http_only_cookies: bool,
    pub same_site_policy: String,
    pub csrf_protection_enabled: bool,
    pub max_age_seconds: i64,
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self {
            cookie_name: "__Host-hzel_session".into(),
            secure_cookies: true,
            http_only_cookies: true,
            same_site_policy: "lax".into(),
            csrf_protection_enabled: true,
            max_age_seconds: 60 * 60 * 8,
        }
    }
}

/// Service responsible for session validation and request identity resolution.
pub struct SessionService {
    config: SessionConfig,
    store: Arc<dyn AuthStore>,
}

impl SessionService {
    /// Creates a new session service.
    pub fn new(config: SessionConfig, store: Arc<dyn AuthStore>) -> Self {
        Self { config, store }
    }

    /// Returns the active session policy.
    pub fn config(&self) -> &SessionConfig {
        &self.config
    }

    /// Authenticates a request using the configured session cookie.
    pub async fn authenticate_headers(
        &self,
        headers: &HeaderMap,
    ) -> Result<AuthenticatedSession, ApiError> {
        let session_token =
            extract_cookie(headers, &self.config.cookie_name).ok_or_else(ApiError::unauthorized)?;
        let session_id = Uuid::parse_str(&session_token).map_err(|_| ApiError::unauthorized())?;

        let session = self
            .store
            .get_session(session_id)
            .await?
            .ok_or_else(ApiError::unauthorized)?;

        if session.revoked_at.is_some() || session.expires_at <= Utc::now() {
            return Err(ApiError::unauthorized());
        }

        let user = self
            .store
            .get_user(session.user_id)
            .await?
            .ok_or_else(ApiError::unauthorized)?;

        if user.status != UserStatus::Active {
            return Err(ApiError::forbidden("User account is disabled"));
        }

        self.store.touch_session(session.id).await?;

        Ok(AuthenticatedSession {
            user: AuthenticatedUser {
                user_id: user.id,
                session_id: Some(session.id),
                email: user.email,
                role: match user.role {
                    UserRole::Admin => UserRole::Admin,
                    UserRole::User => UserRole::User,
                },
                auth_method: session.auth_method.clone(),
                authenticated_at: session.created_at,
                oauth_scopes: None,
            },
            csrf_token: session.csrf_token,
            expires_at: session.expires_at,
        })
    }

    /// Revokes a session so it can no longer be used for authenticated requests.
    pub async fn revoke_session(&self, session_id: Uuid) -> Result<(), ApiError> {
        self.store.revoke_session(session_id).await
    }
}

/// Extracts a cookie value from the request headers.
pub fn extract_cookie(headers: &HeaderMap, cookie_name: &str) -> Option<String> {
    headers
        .get(axum::http::header::COOKIE)
        .and_then(|header| header.to_str().ok())
        .and_then(|raw| {
            raw.split(';').map(str::trim).find_map(|entry| {
                entry
                    .split_once('=')
                    .and_then(|(name, value)| (name == cookie_name).then(|| value.to_string()))
            })
        })
}

#[cfg(test)]
mod tests {
    use axum::http::{header::COOKIE, HeaderMap, HeaderValue};

    use super::extract_cookie;

    #[test]
    fn extracts_cookie_by_name() {
        let mut headers = HeaderMap::new();
        headers.insert(
            COOKIE,
            HeaderValue::from_static("foo=bar; __Host-hzel_session=abc123; theme=dark"),
        );

        assert_eq!(
            extract_cookie(&headers, "__Host-hzel_session"),
            Some("abc123".into())
        );
    }

    #[test]
    fn returns_none_when_cookie_is_missing() {
        let headers = HeaderMap::new();
        assert_eq!(extract_cookie(&headers, "__Host-hzel_session"), None);
    }
}
