//! Structured API error definitions used across the backend.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use serde_json::json;

/// Stable machine-readable error codes returned by the API.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ApiErrorCode {
    Unauthorized,
    Forbidden,
    CsrfRejected,
    ValidationFailed,
    ContainerNotFound,
    CommandNotFound,
    NotImplemented,
    InternalError,
}

/// Standardized API error payload.
#[derive(Debug, Clone)]
pub struct ApiError {
    pub status: StatusCode,
    pub code: ApiErrorCode,
    pub message: String,
}

impl ApiError {
    /// Creates an unauthorized response.
    pub fn unauthorized() -> Self {
        Self::new(
            StatusCode::UNAUTHORIZED,
            ApiErrorCode::Unauthorized,
            "Authentication required",
        )
    }

    /// Creates a forbidden response.
    pub fn forbidden(message: impl Into<String>) -> Self {
        Self::new(StatusCode::FORBIDDEN, ApiErrorCode::Forbidden, message)
    }

    /// Creates a CSRF rejection response.
    pub fn csrf_rejected() -> Self {
        Self::new(
            StatusCode::FORBIDDEN,
            ApiErrorCode::CsrfRejected,
            "A valid CSRF token is required for this request",
        )
    }

    /// Creates a validation error response.
    pub fn validation(message: impl Into<String>) -> Self {
        Self::new(
            StatusCode::BAD_REQUEST,
            ApiErrorCode::ValidationFailed,
            message,
        )
    }

    /// Creates a missing container response.
    pub fn container_not_found(container_id: impl Into<String>) -> Self {
        Self::new(
            StatusCode::NOT_FOUND,
            ApiErrorCode::ContainerNotFound,
            format!("Container {} was not found", container_id.into()),
        )
    }

    /// Creates a missing command response.
    pub fn command_not_found(command_id: impl Into<String>) -> Self {
        Self::new(
            StatusCode::NOT_FOUND,
            ApiErrorCode::CommandNotFound,
            format!("Command job {} was not found", command_id.into()),
        )
    }

    /// Creates an internal server error response.
    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiErrorCode::InternalError,
            message,
        )
    }

    /// Creates a generic not implemented response.
    pub fn not_implemented(message: impl Into<String>) -> Self {
        Self::new(
            StatusCode::NOT_IMPLEMENTED,
            ApiErrorCode::NotImplemented,
            message,
        )
    }

    /// Creates a new error payload.
    pub fn new(status: StatusCode, code: ApiErrorCode, message: impl Into<String>) -> Self {
        Self {
            status,
            code,
            message: message.into(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = Json(json!({
            "error": {
                "code": self.code,
                "message": self.message,
            }
        }));
        (self.status, body).into_response()
    }
}
