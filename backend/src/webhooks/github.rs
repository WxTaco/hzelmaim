//! GitHub webhook provider — verifies X-Hub-Signature-256 and parses push/ping events.

use axum::http::HeaderMap;
use serde::Deserialize;

use crate::{
    utils::error::ApiError,
    webhooks::{
        hmac::verify_hmac_sha256,
        provider::{GitProvider, WebhookEvent, WebhookEventType},
    },
};

/// Implements [`GitProvider`] for GitHub webhook events.
pub struct GitHubProvider;

/// Minimal JSON structure for a GitHub push event body.
#[derive(Debug, Deserialize)]
struct PushPayload {
    #[serde(rename = "ref")]
    git_ref: String,
    head_commit: Option<HeadCommit>,
}

#[derive(Debug, Deserialize)]
struct HeadCommit {
    id: String,
}

impl GitProvider for GitHubProvider {
    fn name(&self) -> &'static str {
        "github"
    }

    fn verify(&self, headers: &HeaderMap, raw_body: &[u8], secret: &str) -> Result<(), ApiError> {
        let sig = headers
            .get("x-hub-signature-256")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(ApiError::webhook_signature_invalid)?;

        verify_hmac_sha256(secret.as_bytes(), raw_body, sig)
    }

    fn parse_event(&self, headers: &HeaderMap, raw_body: &[u8]) -> Result<WebhookEvent, ApiError> {
        let event_type_str = headers
            .get("x-github-event")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| ApiError::bad_request("Missing X-GitHub-Event header"))?;

        let delivery_id = headers
            .get("x-github-delivery")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();

        match event_type_str {
            "ping" => Ok(WebhookEvent {
                event_type: WebhookEventType::Ping,
                delivery_id,
                branch: String::new(),
                head_commit_id: String::new(),
            }),
            "push" => {
                let payload: PushPayload = serde_json::from_slice(raw_body)
                    .map_err(|e| ApiError::bad_request(format!("Invalid push payload: {e}")))?;

                // Strip the "refs/heads/" prefix to get the short branch name.
                let branch = payload
                    .git_ref
                    .strip_prefix("refs/heads/")
                    .unwrap_or(&payload.git_ref)
                    .to_string();

                let head_commit_id = payload
                    .head_commit
                    .map(|c| c.id)
                    .unwrap_or_default();

                Ok(WebhookEvent {
                    event_type: WebhookEventType::Push,
                    delivery_id,
                    branch,
                    head_commit_id,
                })
            }
            other => Err(ApiError::bad_request(format!(
                "Unsupported GitHub event type: {other}"
            ))),
        }
    }
}
