//! Container persistence models and related API-facing DTOs.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── Permission bit flags ──────────────────────────────────────────────────────
//
// Each constant occupies exactly one bit of the i32 stored in
// `container_ownerships.permissions`.  The three named presets below map the
// legacy string-based `access_level` values onto this bitmask so that the
// migration is fully backward-compatible.

pub const PERM_VIEW:         i32 = 0b0000_0001; //   1 — read record, appear in list
pub const PERM_READ_METRICS: i32 = 0b0000_0010; //   2 — GET /metrics
pub const PERM_START_STOP:   i32 = 0b0000_0100; //   4 — POST /start, /stop, /restart
pub const PERM_TERMINAL:     i32 = 0b0000_1000; //   8 — WS /terminal
pub const PERM_WEBHOOKS:     i32 = 0b0001_0000; //  16 — create/update/delete webhooks
pub const PERM_NETWORKS:     i32 = 0b0010_0000; //  32 — attach/detach networks
pub const PERM_SHARE:        i32 = 0b0100_0000; //  64 — POST /share, invite users
pub const PERM_DELETE:       i32 = 0b1000_0000; // 128 — delete container (future use)

/// Preset that bridges the legacy `"viewer"` access-level string.
pub const PRESET_VIEWER:   i32 = PERM_VIEW | PERM_READ_METRICS;
/// Preset that bridges the legacy `"operator"` access-level string.
pub const PRESET_OPERATOR: i32 = PERM_VIEW | PERM_READ_METRICS | PERM_START_STOP
                                 | PERM_TERMINAL | PERM_WEBHOOKS | PERM_NETWORKS;
/// Preset that bridges the legacy `"owner"` access-level string (all bits set).
pub const PRESET_OWNER:    i32 = 0b1111_1111;

/// Newtype wrapping the raw permissions integer with convenience methods.
///
/// Serialises transparently as a plain integer (e.g. `255`) so the frontend
/// can read individual bits with bitwise AND without any extra parsing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, utoipa::ToSchema)]
#[serde(transparent)]
pub struct Permissions(pub i32);

impl Permissions {
    /// Returns `true` when **all** bits in `flag` are set in this mask.
    #[inline]
    pub fn has(self, flag: i32) -> bool {
        (self.0 & flag) == flag
    }

    /// Constructs a `Permissions` value from the legacy `access_level` string.
    pub fn from_preset(level: &str) -> Self {
        Self(match level {
            "owner"    => PRESET_OWNER,
            "operator" => PRESET_OPERATOR,
            "viewer"   => PRESET_VIEWER,
            _          => 0,
        })
    }

    /// Maps the bitmask back to the closest named preset, if it matches exactly.
    pub fn to_preset_name(self) -> Option<&'static str> {
        match self.0 {
            PRESET_OWNER    => Some("owner"),
            PRESET_OPERATOR => Some("operator"),
            PRESET_VIEWER   => Some("viewer"),
            _               => None,
        }
    }
}

// ── Lifecycle state ───────────────────────────────────────────────────────────

/// Lifecycle state tracked by the control plane.
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ContainerState {
    Provisioning,
    Running,
    Stopped,
    Failed,
}

// ── Legacy access-level enum (kept for reversibility) ────────────────────────

/// Access level a user holds on a container.
///
/// **Deprecated** in favour of the `permissions` integer bitmask.  Kept so
/// that the `container_ownerships.access_level` column can be restored without
/// data loss.  Do not use for new authorization checks.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, utoipa::ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum AccessLevel {
    Owner,
    Operator,
    Viewer,
}

/// Relationship between a user and a container.
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ContainerOwnership {
    pub container_id: Uuid,
    pub user_id: Uuid,
    pub access_level: AccessLevel,
    pub is_primary: bool,
}

// ── Core container record ─────────────────────────────────────────────────────

/// Database-backed container record.
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ContainerRecord {
    pub id: Uuid,
    pub proxmox_ctid: i32,
    pub name: String,
    pub node_name: String,
    /// Provisioned vCPU count, stored at creation time.
    pub cpu_cores: i16,
    /// Provisioned RAM in MiB, stored at creation time.
    pub memory_mb: i32,
    /// Provisioned disk in GiB, stored at creation time.
    pub disk_gb: i32,
    pub state: ContainerState,
    pub created_at: DateTime<Utc>,
}

/// A container record together with the requesting user's permission bitmask.
///
/// Returned by `GET /api/v1/containers` and `GET /api/v1/containers/{id}` so
/// that the frontend can gate individual UI controls (start/stop, terminal,
/// webhooks, sharing) without a separate request.
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ContainerWithPermissions {
    #[serde(flatten)]
    pub container: ContainerRecord,
    /// Raw permission bitmask for the requesting user.  Apply bitwise AND
    /// against the `PERM_*` constants to test individual capabilities.
    pub permissions: i32,
}

/// A pending or resolved invitation to share a container with another user.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct ContainerInvitation {
    pub id: Uuid,
    pub container_id: Uuid,
    pub user_id: Uuid,
    pub invited_by: Uuid,
    pub invited_at: DateTime<Utc>,
    pub responded_at: Option<DateTime<Utc>>,
    /// `None` until the user responds; then `"accepted"` or `"declined"`.
    pub response: Option<String>,
    /// Permission bitmask that will be granted to the invitee upon acceptance.
    /// Composed from the `PERM_*` constants in this module.
    pub permissions: i32,
}

/// Flattened view returned by the pending container-sharing invitations endpoint.
/// Joins containers and inviter so the frontend has everything it needs in one shot.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct PendingContainerInvitationView {
    pub id: Uuid,
    pub container_id: Uuid,
    pub container_name: String,
    /// Display name of the user who sent the invitation (may be absent).
    pub invited_by_display_name: Option<String>,
    /// Email of the user who sent the invitation.
    pub invited_by_email: String,
    pub invited_at: DateTime<Utc>,
    /// Permission bitmask that will be granted on acceptance.
    pub permissions: i32,
}
