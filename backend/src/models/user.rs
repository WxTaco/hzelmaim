//! User and session-adjacent model definitions.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Supported user roles for authorization decisions.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum UserRole {
    Admin,
    User,
}

/// Supported user lifecycle states.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum UserStatus {
    Active,
    Disabled,
}

/// Persistent user record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserRecord {
    pub id: Uuid,
    pub email: String,
    /// Full display name from the OIDC `name` claim (`profile` scope).
    pub display_name: Option<String>,
    /// Profile picture URL from the OIDC `picture` claim (`profile` scope).
    pub picture_url: Option<String>,
    pub role: UserRole,
    pub status: UserStatus,
    pub created_at: DateTime<Utc>,
}
