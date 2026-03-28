//! Session and identity records used by the authentication subsystem.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Authentication mechanism used to create a session.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, utoipa::ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum AuthMethod {
    /// Browser session backed by a session cookie.
    Session,
    /// JWT minted after an OIDC authorization-code flow.
    Oidc,
    /// Personal access token (stateless, no session row).
    Pat,
    /// JWT minted for a registered OAuth 2.0 application acting on behalf of a user.
    Oauth,
}

/// Persistent session record stored by the backend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub csrf_token: String,
    pub auth_method: AuthMethod,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub last_seen_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
}
