//! Personal access token model.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A personal access token that can authenticate API requests.
///
/// The raw token is only returned once at creation time.
/// Only the SHA-256 hex digest is persisted.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiTokenRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    /// Human-readable label chosen by the user.
    pub name: String,
    /// SHA-256 hex digest of the raw token value.
    #[serde(skip_serializing)]
    pub token_hash: String,
    /// First 12 characters of the full token (e.g. `hzel_AbCdEfGh`).
    pub prefix: String,
    pub last_used_at: Option<DateTime<Utc>>,
    /// `None` means the token never expires.
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
}

/// Subset of token fields that are safe to return to the owner.
#[derive(Debug, Clone, Serialize)]
pub struct ApiTokenView {
    pub id: Uuid,
    pub name: String,
    pub prefix: String,
    pub last_used_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
}

impl From<ApiTokenRecord> for ApiTokenView {
    fn from(r: ApiTokenRecord) -> Self {
        Self {
            id: r.id,
            name: r.name,
            prefix: r.prefix,
            last_used_at: r.last_used_at,
            expires_at: r.expires_at,
            created_at: r.created_at,
            revoked_at: r.revoked_at,
        }
    }
}

