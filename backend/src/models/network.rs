//! Data models for the private networking feature (Option A: Proxmox Linux bridges).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Lifecycle state of a private network (bridge).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum NetworkState {
    Creating,
    Active,
    Deleting,
    Failed,
}

impl NetworkState {
    pub fn as_str(&self) -> &'static str {
        match self {
            NetworkState::Creating => "creating",
            NetworkState::Active => "active",
            NetworkState::Deleting => "deleting",
            NetworkState::Failed => "failed",
        }
    }
}

impl std::str::FromStr for NetworkState {
    type Err = ();
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "creating" => Ok(NetworkState::Creating),
            "active" => Ok(NetworkState::Active),
            "deleting" => Ok(NetworkState::Deleting),
            "failed" => Ok(NetworkState::Failed),
            _ => Err(()),
        }
    }
}

/// Lifecycle state of a container's membership in a private network.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum MembershipState {
    Attaching,
    Active,
    Detaching,
    Failed,
}

impl MembershipState {
    pub fn as_str(&self) -> &'static str {
        match self {
            MembershipState::Attaching => "attaching",
            MembershipState::Active => "active",
            MembershipState::Detaching => "detaching",
            MembershipState::Failed => "failed",
        }
    }
}

impl std::str::FromStr for MembershipState {
    type Err = ();
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "attaching" => Ok(MembershipState::Attaching),
            "active" => Ok(MembershipState::Active),
            "detaching" => Ok(MembershipState::Detaching),
            "failed" => Ok(MembershipState::Failed),
            _ => Err(()),
        }
    }
}

/// A user-owned private network backed by a Proxmox Linux bridge.
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct PrivateNetwork {
    pub id: Uuid,
    pub owner_user_id: Uuid,
    pub name: String,
    /// Linux bridge device name on the Proxmox host, e.g. `"vmbr105"`.
    pub bridge_name: String,
    /// Integer N from vmbrN; stored for display and reconstruction.
    pub bridge_id: i32,
    /// RFC 1918 CIDR allocated to this network, e.g. `"10.42.0.0/24"`.
    pub cidr: String,
    pub state: NetworkState,
    pub created_at: DateTime<Utc>,
}

/// A container's NIC attachment to a private network.
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct NetworkMembership {
    pub id: Uuid,
    pub network_id: Uuid,
    pub container_id: Uuid,
    /// Static host address allocated from the network CIDR, e.g. `"10.42.0.3"`.
    pub private_ip: String,
    /// Proxmox netN slot index (1–15) used for this NIC on the container.
    pub net_index: i16,
    pub state: MembershipState,
    pub created_at: DateTime<Utc>,
}

/// API request body for creating a private network.
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateNetworkRequest {
    /// Human-readable label for this network.
    pub name: String,
    /// RFC 1918 CIDR, e.g. `"10.42.0.0/24"`. Prefix must be /16–/28.
    pub cidr: String,
}

/// API request body for renaming a private network.
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct RenameNetworkRequest {
    pub name: String,
}

/// API request body for adding a container to a private network.
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct AddMemberRequest {
    pub container_id: Uuid,
}
