//! Forgejo webhook provider stub — not yet implemented.

use axum::http::HeaderMap;

use crate::{
    utils::error::ApiError,
    webhooks::provider::{GitProvider, WebhookEvent},
};

/// Stub implementation of [`GitProvider`] for Forgejo.
///
/// All methods will panic with an "unimplemented" message at runtime.
/// Forgejo support is planned for a future release.
pub struct ForgejoProvider;

impl GitProvider for ForgejoProvider {
    fn name(&self) -> &'static str {
        "forgejo"
    }

    fn verify(
        &self,
        _headers: &HeaderMap,
        _raw_body: &[u8],
        _secret: &str,
    ) -> Result<(), ApiError> {
        unimplemented!("Forgejo provider not yet implemented")
    }

    fn parse_event(
        &self,
        _headers: &HeaderMap,
        _raw_body: &[u8],
    ) -> Result<WebhookEvent, ApiError> {
        unimplemented!("Forgejo provider not yet implemented")
    }
}
