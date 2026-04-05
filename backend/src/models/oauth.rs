//! OAuth 2.0 application, authorization code, and refresh token models.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A registered OAuth 2.0 application created by a platform user.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthApplication {
    pub id: Uuid,
    pub owner_user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    /// Public identifier included in authorization URLs.
    pub client_id: Uuid,
    /// SHA-256 hex digest of the raw client secret. Never serialized.
    #[serde(skip_serializing)]
    pub client_secret_hash: String,
    /// First 12 characters of the raw client secret (display only).
    pub client_secret_prefix: String,
    /// Allowed redirect URIs. The redirect_uri on each authorize request must
    /// exactly match one entry in this list.
    pub redirect_uris: Vec<String>,
    pub created_at: DateTime<Utc>,
    /// Set when the owner deletes the application.
    pub revoked_at: Option<DateTime<Utc>>,
}

/// Public subset of an OAuth application returned to the owner.
/// Never includes the secret hash.
#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
pub struct OAuthApplicationView {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub client_id: Uuid,
    pub client_secret_prefix: String,
    pub redirect_uris: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
}

impl From<OAuthApplication> for OAuthApplicationView {
    fn from(app: OAuthApplication) -> Self {
        Self {
            id: app.id,
            name: app.name,
            description: app.description,
            client_id: app.client_id,
            client_secret_prefix: app.client_secret_prefix,
            redirect_uris: app.redirect_uris,
            created_at: app.created_at,
            revoked_at: app.revoked_at,
        }
    }
}

/// Minimal public view returned to unauthenticated consent-page requests.
#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
pub struct OAuthAppPublicView {
    pub client_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    /// Display name of the user who registered the application.
    pub owner_name: String,
}

/// A short-lived, single-use authorization code (10-minute TTL).
#[derive(Debug, Clone)]
pub struct OAuthAuthorizationCode {
    pub id: Uuid,
    pub app_id: Uuid,
    pub user_id: Uuid,
    /// SHA-256 hex digest of the raw code value.
    pub code_hash: String,
    /// The redirect_uri supplied by the client on the authorize request.
    /// Must match exactly when the code is exchanged at the token endpoint.
    pub redirect_uri: String,
    pub expires_at: DateTime<Utc>,
    /// Set atomically when the code is consumed; prevents replay.
    pub used_at: Option<DateTime<Utc>>,
}

/// A long-lived OAuth refresh token stored as a SHA-256 hash.
#[derive(Debug, Clone)]
pub struct OAuthRefreshToken {
    pub id: Uuid,
    pub app_id: Uuid,
    pub user_id: Uuid,
    /// SHA-256 hex digest of the raw token value.
    pub token_hash: String,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
    pub revoked_at: Option<DateTime<Utc>>,
}
