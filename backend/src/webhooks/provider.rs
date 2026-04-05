//! Git provider abstraction for inbound webhook verification and event parsing.

use async_trait::async_trait;
use axum::http::HeaderMap;

use crate::utils::error::ApiError;

/// Discriminates the type of event received from a git provider.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WebhookEventType {
    /// A branch was pushed to — triggers deployment.
    Push,
    /// A no-op connectivity test from the provider.
    Ping,
}

impl WebhookEventType {
    pub fn as_str(&self) -> &'static str {
        match self {
            WebhookEventType::Push => "push",
            WebhookEventType::Ping => "ping",
        }
    }
}

/// Normalised event parsed from a provider's inbound webhook payload.
#[derive(Debug, Clone)]
pub struct WebhookEvent {
    pub event_type: WebhookEventType,
    /// Provider-assigned delivery UUID (used for idempotency tracking).
    pub delivery_id: String,
    /// Short branch name (e.g. "main"). Empty for Ping events.
    pub branch: String,
    /// SHA of the pushed commit. Empty for Ping events.
    pub head_commit_id: String,
}

/// Pluggable interface for a git hosting provider.
///
/// Implement this trait to add support for a new provider (GitHub, Forgejo, etc.).
#[async_trait]
pub trait GitProvider: Send + Sync {
    /// Returns the stable lower-case provider name used as a registry key.
    fn name(&self) -> &'static str;

    /// Verifies the provider's request signature over the raw body bytes.
    ///
    /// Returns `Ok(())` on success or an [`ApiError`] (401-class) on failure.
    fn verify(&self, headers: &HeaderMap, raw_body: &[u8], secret: &str)
        -> Result<(), ApiError>;

    /// Parses the provider-specific headers and body into a normalised [`WebhookEvent`].
    fn parse_event(
        &self,
        headers: &HeaderMap,
        raw_body: &[u8],
    ) -> Result<WebhookEvent, ApiError>;
}
