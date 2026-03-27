//! CSRF validation extractor for cookie-authenticated mutating routes.

use axum::{
    extract::FromRequestParts,
    http::{request::Parts, HeaderMap},
};

use crate::{app_state::AppState, auth::context::AuthenticatedSession, utils::error::ApiError};

/// Header used by browser clients to present the session-bound CSRF token.
pub const CSRF_HEADER_NAME: &str = "x-csrf-token";

/// Marker extractor enforcing CSRF validation for mutating handlers.
#[derive(Debug, Clone, Copy)]
pub struct CsrfProtected;

impl FromRequestParts<AppState> for CsrfProtected {
    type Rejection = ApiError;

    /// Validates CSRF for session-based auth, or skips validation for JWT tokens.
    /// JWT tokens don't need CSRF protection since they're not sent via cookies.
    fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> impl std::future::Future<Output = Result<Self, Self::Rejection>> + Send {
        let session_from_extensions = parts.extensions.get::<AuthenticatedSession>().cloned();
        let session_service = state.session_service.clone();
        let headers = parts.headers.clone();

        async move {
            // Stateless auth (PAT or JWT) arrives via `Authorization: Bearer <token>`.
            // These are not sent by the browser implicitly, so they are not vulnerable
            // to CSRF and do not require the CSRF header.
            let is_bearer = headers
                .get(axum::http::header::AUTHORIZATION)
                .and_then(|h| h.to_str().ok())
                .map(|h| h.starts_with("Bearer "))
                .unwrap_or(false);

            if is_bearer {
                return Ok(Self);
            }

            // Session-cookie auth requires CSRF validation.
            let session = match session_from_extensions {
                Some(session) => session,
                None => session_service.authenticate_headers(&headers).await?,
            };

            validate_csrf_headers(&headers, &session)?;
            parts.extensions.insert(session);
            Ok(Self)
        }
    }
}

/// Compares the presented CSRF token against the authenticated session token.
pub fn validate_csrf_headers(
    headers: &HeaderMap,
    session: &AuthenticatedSession,
) -> Result<(), ApiError> {
    let header_value = headers
        .get(CSRF_HEADER_NAME)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(ApiError::csrf_rejected)?;

    if header_value == session.csrf_token {
        Ok(())
    } else {
        Err(ApiError::csrf_rejected())
    }
}

#[cfg(test)]
mod tests {
    use axum::http::{HeaderMap, HeaderValue};
    use chrono::Utc;
    use uuid::Uuid;

    use crate::{
        auth::context::{AuthenticatedSession, AuthenticatedUser},
        models::{session::AuthMethod, user::UserRole},
    };

    use super::{validate_csrf_headers, CSRF_HEADER_NAME};

    fn session() -> AuthenticatedSession {
        AuthenticatedSession {
            user: AuthenticatedUser {
                user_id: Uuid::new_v4(),
                session_id: Some(Uuid::new_v4()),
                email: "admin@example.internal".into(),
                role: UserRole::Admin,
                auth_method: AuthMethod::Session,
                authenticated_at: Utc::now(),
                oauth_scopes: None,
            },
            csrf_token: "csrf-token-123".into(),
            expires_at: Utc::now(),
        }
    }

    #[test]
    fn accepts_matching_csrf_token() {
        let mut headers = HeaderMap::new();
        headers.insert(CSRF_HEADER_NAME, HeaderValue::from_static("csrf-token-123"));

        assert!(validate_csrf_headers(&headers, &session()).is_ok());
    }

    #[test]
    fn rejects_missing_csrf_token() {
        let headers = HeaderMap::new();
        assert!(validate_csrf_headers(&headers, &session()).is_err());
    }

    #[test]
    fn rejects_mismatched_csrf_token() {
        let mut headers = HeaderMap::new();
        headers.insert(CSRF_HEADER_NAME, HeaderValue::from_static("wrong-token"));

        assert!(validate_csrf_headers(&headers, &session()).is_err());
    }
}
