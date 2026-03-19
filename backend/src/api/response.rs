//! Shared response envelopes used by HTTP handlers.

use serde::Serialize;

/// Standard success response envelope.
#[derive(Debug, Clone, Serialize)]
pub struct ApiResponse<T> {
    pub data: T,
}

impl<T> ApiResponse<T> {
    /// Wraps a payload in the standard success response shape.
    pub fn new(data: T) -> Self {
        Self { data }
    }
}
