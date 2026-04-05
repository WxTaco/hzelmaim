//! Private networking service — manages Proxmox Linux bridges and container NIC attachments.

use std::collections::HashSet;
use std::net::Ipv4Addr;
use std::sync::Arc;

use chrono::Utc;
use ipnet::Ipv4Net;
use tracing::{info, warn};
use uuid::Uuid;

use crate::{
    auth::context::AuthenticatedUser,
    db::{container_repo::ContainerRepo, network_repo::NetworkRepo},
    models::{
        container::{PERM_NETWORKS, PERM_VIEW},
        network::{
            AddMemberRequest, CreateNetworkRequest, MembershipState, NetworkMembership,
            NetworkState, PrivateNetwork, RenameNetworkRequest,
        },
        user::UserRole,
    },
    proxmox::{client::ProxmoxClient, types::ContainerRuntimeStatus},
    services::{audit_service::AuditService, terminal_service::TerminalService},
    utils::error::ApiError,
};

/// Maximum number of active user-private networks per Proxmox node.
/// Guards against unbounded bridge proliferation on the host kernel.
pub const MAX_NETWORKS_PER_NODE: i64 = 100;

/// Maximum number of active private networks a single user may own.
pub const MAX_NETWORKS_PER_USER: i64 = 5;

/// Orchestrates private network lifecycle: bridge creation/deletion and NIC attachments.
pub struct NetworkService {
    network_repo: Arc<dyn NetworkRepo>,
    container_repo: Arc<dyn ContainerRepo>,
    proxmox: Arc<dyn ProxmoxClient>,
    terminal: Arc<TerminalService>,
    audit: Arc<AuditService>,
}

impl NetworkService {
    pub fn new(
        network_repo: Arc<dyn NetworkRepo>,
        container_repo: Arc<dyn ContainerRepo>,
        proxmox: Arc<dyn ProxmoxClient>,
        terminal: Arc<TerminalService>,
        audit: Arc<AuditService>,
    ) -> Self {
        Self {
            network_repo,
            container_repo,
            proxmox,
            terminal,
            audit,
        }
    }

    // -------------------------------------------------------------------------
    // CIDR helpers (pure functions, no I/O)
    // -------------------------------------------------------------------------

    /// Validates that `cidr` is an RFC 1918 prefix between /16 and /28.
    fn validate_cidr(cidr: &str) -> Result<Ipv4Net, ApiError> {
        let net: Ipv4Net = cidr
            .parse()
            .map_err(|_| ApiError::validation("Invalid CIDR notation (e.g. 10.42.0.0/24)"))?;

        let private_ranges: [Ipv4Net; 3] = [
            "10.0.0.0/8".parse().unwrap(),
            "172.16.0.0/12".parse().unwrap(),
            "192.168.0.0/16".parse().unwrap(),
        ];
        let is_private = private_ranges
            .iter()
            .any(|r| r.contains(&net.network()));
        if !is_private {
            return Err(ApiError::validation(
                "CIDR must be within RFC 1918 private address space \
                 (10.0.0.0/8, 172.16.0.0/12, or 192.168.0.0/16)",
            ));
        }
        let prefix = net.prefix_len();
        if !(16..=28).contains(&prefix) {
            return Err(ApiError::validation(
                "CIDR prefix length must be between /16 and /28",
            ));
        }
        Ok(net)
    }

    /// Returns an error if `new_cidr` overlaps with any of `existing` networks.
    fn check_no_overlap(new_cidr: &Ipv4Net, existing: &[PrivateNetwork]) -> Result<(), ApiError> {
        for net in existing {
            let Ok(existing_cidr): Result<Ipv4Net, _> = net.cidr.parse() else {
                continue;
            };
            if new_cidr.contains(&existing_cidr.network())
                || existing_cidr.contains(&new_cidr.network())
            {
                return Err(ApiError::bad_request(format!(
                    "CIDR {} overlaps with existing network '{}' ({})",
                    new_cidr, net.name, net.cidr
                )));
            }
        }
        Ok(())
    }

    /// Picks the lowest available host address in `cidr` not present in `used`.
    /// Skips the network address (.0) and the first host (.1, reserved for future gateway use).
    fn allocate_ip(cidr: &Ipv4Net, used: &[String]) -> Result<Ipv4Addr, ApiError> {
        let used_set: HashSet<Ipv4Addr> = used.iter().filter_map(|s| s.parse().ok()).collect();
        // skip(1) skips the network address; skip the additional .1 as a gateway reserve
        for host in cidr.hosts().skip(1) {
            if !used_set.contains(&host) {
                return Ok(host);
            }
        }
        Err(ApiError::bad_request(
            "Network address space exhausted — no free host addresses remain",
        ))
    }

    // -------------------------------------------------------------------------
    // Authorization helpers
    // -------------------------------------------------------------------------

    /// Checks that the actor owns the network or is a platform admin.
    fn require_network_owner(
        actor: &AuthenticatedUser,
        network: &PrivateNetwork,
    ) -> Result<(), ApiError> {
        if actor.effective_role() == &UserRole::Admin || actor.user_id == network.owner_user_id {
            Ok(())
        } else {
            Err(ApiError::forbidden("You do not own this network"))
        }
    }

    /// Verifies that `actor` holds `flag` in the container's permission bitmask.
    ///
    /// Admins always pass.  Returns 403 when the bit is absent.
    async fn require_container_permission(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
        flag: i32,
    ) -> Result<(), ApiError> {
        if actor.effective_role() == &UserRole::Admin {
            return Ok(());
        }
        let perms = self
            .container_repo
            .get_permissions(container_id, actor.user_id)
            .await?;
        if !perms.has(flag) {
            return Err(ApiError::forbidden(
                "You do not have permission to perform this action on the container",
            ));
        }
        Ok(())
    }


    // -------------------------------------------------------------------------
    // Network CRUD
    // -------------------------------------------------------------------------

    /// Creates a new private network (Proxmox Linux bridge) for the authenticated user.
    pub async fn create_network(
        &self,
        actor: &AuthenticatedUser,
        req: CreateNetworkRequest,
    ) -> Result<PrivateNetwork, ApiError> {
        // Validate name
        let name = req.name.trim().to_string();
        if name.is_empty() || name.len() > 100 {
            return Err(ApiError::validation("Network name must be 1–100 characters"));
        }

        // Validate and parse CIDR
        let cidr_net = Self::validate_cidr(&req.cidr)?;

        // Node-level and per-user limits
        let node_count = self.network_repo.count_active().await?;
        if node_count >= MAX_NETWORKS_PER_NODE {
            return Err(ApiError::bad_request(format!(
                "Platform limit reached: at most {MAX_NETWORKS_PER_NODE} private networks \
                 may exist on this node"
            )));
        }
        let user_count = self.network_repo.count_for_user(actor.user_id).await?;
        if user_count >= MAX_NETWORKS_PER_USER {
            return Err(ApiError::bad_request(format!(
                "You have reached the maximum of {MAX_NETWORKS_PER_USER} private networks"
            )));
        }

        // CIDR overlap check against the user's existing networks
        let existing = self.network_repo.list_for_user(actor.user_id).await?;
        Self::check_no_overlap(&cidr_net, &existing)?;

        // Allocate bridge ID from the global sequence
        let bridge_id = self.network_repo.next_bridge_id().await?;
        let bridge_name = format!("vmbr{bridge_id}");

        let network = PrivateNetwork {
            id: Uuid::new_v4(),
            owner_user_id: actor.user_id,
            name,
            bridge_name: bridge_name.clone(),
            bridge_id,
            cidr: cidr_net.to_string(),
            state: NetworkState::Creating,
            created_at: Utc::now(),
        };

        // Persist first (state=creating) so we can track partial failures
        self.network_repo.create(&network).await?;

        // Create the bridge on Proxmox; on failure leave state=creating for manual cleanup
        if let Err(e) = self.proxmox.create_bridge(bridge_id).await {
            warn!(
                network_id = %network.id,
                bridge = %bridge_name,
                error = %e.message,
                "Proxmox bridge creation failed; network left in 'creating' state"
            );
            return Err(e);
        }

        self.network_repo
            .update_state(network.id, NetworkState::Active)
            .await?;

        self.audit
            .log_success(Some(actor.user_id), None, "network.create")
            .await;
        info!(
            network_id = %network.id,
            bridge = %bridge_name,
            cidr = %cidr_net,
            "private network created"
        );

        Ok(PrivateNetwork {
            state: NetworkState::Active,
            ..network
        })
    }

    /// Lists private networks owned by the authenticated user.
    pub async fn list_networks(
        &self,
        actor: &AuthenticatedUser,
    ) -> Result<Vec<PrivateNetwork>, ApiError> {
        self.network_repo.list_for_user(actor.user_id).await
    }

    /// Loads a single network by ID, verifying the actor has access.
    pub async fn get_network(
        &self,
        actor: &AuthenticatedUser,
        network_id: Uuid,
    ) -> Result<PrivateNetwork, ApiError> {
        let network = self
            .network_repo
            .get(network_id)
            .await?
            .ok_or_else(|| ApiError::network_not_found(network_id.to_string()))?;
        Self::require_network_owner(actor, &network)?;
        Ok(network)
    }

    /// Renames a network. Only the name label is mutable after creation.
    pub async fn rename_network(
        &self,
        actor: &AuthenticatedUser,
        network_id: Uuid,
        req: RenameNetworkRequest,
    ) -> Result<PrivateNetwork, ApiError> {
        let network = self.get_network(actor, network_id).await?;
        let name = req.name.trim().to_string();
        if name.is_empty() || name.len() > 100 {
            return Err(ApiError::validation("Network name must be 1–100 characters"));
        }
        self.network_repo.rename(network.id, &name).await?;
        self.network_repo.get(network_id).await?.ok_or_else(|| {
            ApiError::internal("network disappeared after rename")
        })
    }

    /// Deletes a private network and removes its Proxmox bridge.
    /// Fails if any containers are still attached.
    pub async fn delete_network(
        &self,
        actor: &AuthenticatedUser,
        network_id: Uuid,
    ) -> Result<(), ApiError> {
        let network = self.get_network(actor, network_id).await?;

        let members = self.network_repo.list_members(network_id).await?;
        if !members.is_empty() {
            return Err(ApiError::bad_request(
                "Remove all containers from the network before deleting it",
            ));
        }

        self.network_repo
            .update_state(network_id, NetworkState::Deleting)
            .await?;

        if let Err(e) = self.proxmox.delete_bridge(&network.bridge_name).await {
            warn!(
                network_id = %network_id,
                bridge = %network.bridge_name,
                error = %e.message,
                "Proxmox bridge deletion failed; network left in 'deleting' state"
            );
            return Err(e);
        }

        self.network_repo.delete(network_id).await?;
        self.audit
            .log_success(Some(actor.user_id), None, "network.delete")
            .await;
        info!(network_id = %network_id, "private network deleted");
        Ok(())
    }


    // -------------------------------------------------------------------------
    // Membership management
    // -------------------------------------------------------------------------

    /// Lists all containers attached to a private network.
    pub async fn list_members(
        &self,
        actor: &AuthenticatedUser,
        network_id: Uuid,
    ) -> Result<Vec<NetworkMembership>, ApiError> {
        let network = self.get_network(actor, network_id).await?;
        self.network_repo.list_members(network.id).await
    }

    /// Lists all networks a container belongs to.
    pub async fn list_for_container(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
    ) -> Result<Vec<NetworkMembership>, ApiError> {
        // Caller needs PERM_VIEW to see the container's network memberships.
        self.require_container_permission(actor, container_id, PERM_VIEW).await?;
        self.network_repo.list_for_container(container_id).await
    }

    /// Attaches a container to a private network.
    ///
    /// 1. Validates ownership and access.
    /// 2. Allocates an IP from the network CIDR.
    /// 3. Finds the lowest unused NIC slot on the container.
    /// 4. Inserts the membership record (`state=attaching`).
    /// 5. Calls Proxmox to add the NIC to the container config.
    /// 6. If the container is running, SSHs in to bring the interface up.
    /// 7. Advances the membership to `state=active`.
    pub async fn add_member(
        &self,
        actor: &AuthenticatedUser,
        network_id: Uuid,
        req: AddMemberRequest,
    ) -> Result<NetworkMembership, ApiError> {
        let container_id = req.container_id;

        // Load and authorise
        let network = self.get_network(actor, network_id).await?;
        if network.state != NetworkState::Active {
            return Err(ApiError::bad_request("Network is not in an active state"));
        }
        self.require_container_permission(actor, container_id, PERM_NETWORKS).await?;

        // Load container record (need proxmox_ctid)
        let container = self
            .container_repo
            .get(container_id)
            .await?
            .ok_or_else(|| ApiError::container_not_found(container_id.to_string()))?;

        // Check not already a member
        let existing_members = self.network_repo.list_members(network_id).await?;
        if existing_members.iter().any(|m| m.container_id == container_id) {
            return Err(ApiError::bad_request(
                "Container is already a member of this network",
            ));
        }

        // Allocate IP
        let used_ips = self.network_repo.used_ips(network_id).await?;
        let cidr_net: Ipv4Net = network.cidr.parse().map_err(|_| {
            ApiError::internal(format!("Stored CIDR '{}' is not parseable", network.cidr))
        })?;
        let private_ip = Self::allocate_ip(&cidr_net, &used_ips)?;

        // Find lowest free NIC slot (1–15)
        let used_indices = self.network_repo.used_net_indices(container_id).await?;
        let used_set: HashSet<i16> = used_indices.into_iter().collect();
        let net_index = (1i16..=15i16)
            .find(|i| !used_set.contains(i))
            .ok_or_else(|| {
                ApiError::bad_request("Container has no available NIC slots (maximum is 15)")
            })?;

        // Insert membership (state=attaching) — reserves IP and net_index atomically
        let membership = NetworkMembership {
            id: Uuid::new_v4(),
            network_id,
            container_id,
            private_ip: private_ip.to_string(),
            net_index,
            state: MembershipState::Attaching,
            created_at: Utc::now(),
        };
        self.network_repo.insert_member(&membership).await?;

        // Attach NIC via Proxmox API
        let attach_result = self
            .proxmox
            .attach_container_nic(
                container.proxmox_ctid,
                net_index as u8,
                &network.bridge_name,
                &private_ip.to_string(),
                cidr_net.prefix_len(),
            )
            .await;

        if let Err(e) = attach_result {
            warn!(
                member_id = %membership.id,
                error = %e.message,
                "Proxmox NIC attach failed; membership left in 'attaching' state"
            );
            let _ = self
                .network_repo
                .update_member_state(membership.id, MembershipState::Failed)
                .await;
            return Err(e);
        }

        // Hot-configure IP inside the container if it is currently running.
        // Proxmox injects the static IP into the guest on next boot; this SSH
        // call handles the running case without requiring a restart.
        let status = self
            .proxmox
            .container_status(container.proxmox_ctid)
            .await
            .unwrap_or(ContainerRuntimeStatus::Unknown);

        if status == ContainerRuntimeStatus::Running {
            let cmd = format!(
                "ip link set eth{ni} up && ip addr add {ip}/{prefix} dev eth{ni}",
                ni = net_index,
                ip = private_ip,
                prefix = cidr_net.prefix_len(),
            );
            let key_id = format!("network:{}:attach", network_id);
            if let Err(e) = self
                .terminal
                .exec_command(container.proxmox_ctid, &key_id, &cmd)
                .await
            {
                // Log and continue — the NIC is attached in Proxmox config; the guest
                // will pick up the IP on next restart even if SSH config failed.
                warn!(
                    member_id = %membership.id,
                    error = %e.message,
                    "SSH hot-configure failed; container will receive IP on next restart"
                );
            }
        }

        // Advance to active
        self.network_repo
            .update_member_state(membership.id, MembershipState::Active)
            .await?;

        self.audit
            .log_success(Some(actor.user_id), Some(container_id), "network.member.add")
            .await;
        info!(
            network_id = %network_id,
            container_id = %container_id,
            ip = %private_ip,
            net_index,
            "container attached to private network"
        );

        Ok(NetworkMembership {
            state: MembershipState::Active,
            ..membership
        })
    }

    /// Removes a container from a private network and frees its private IP.
    pub async fn remove_member(
        &self,
        actor: &AuthenticatedUser,
        network_id: Uuid,
        container_id: Uuid,
    ) -> Result<(), ApiError> {
        let network = self.get_network(actor, network_id).await?;
        self.require_container_permission(actor, container_id, PERM_NETWORKS).await?;

        // Find the membership
        let members = self.network_repo.list_members(network_id).await?;
        let member = members
            .iter()
            .find(|m| m.container_id == container_id)
            .ok_or_else(|| ApiError::network_member_not_found(container_id.to_string()))?
            .clone();

        // Load container for ctid
        let container = self
            .container_repo
            .get(container_id)
            .await?
            .ok_or_else(|| ApiError::container_not_found(container_id.to_string()))?;

        // Mark as detaching
        self.network_repo
            .update_member_state(member.id, MembershipState::Detaching)
            .await?;

        // Best-effort SSH deconfigure if the container is running
        let status = self
            .proxmox
            .container_status(container.proxmox_ctid)
            .await
            .unwrap_or(ContainerRuntimeStatus::Unknown);

        if status == ContainerRuntimeStatus::Running {
            let cmd = format!(
                "ip addr del {ip}/{prefix} dev eth{ni} 2>/dev/null; ip link set eth{ni} down 2>/dev/null; true",
                ip = member.private_ip,
                prefix = network.cidr.parse::<Ipv4Net>().map(|n| n.prefix_len()).unwrap_or(24),
                ni = member.net_index,
            );
            let key_id = format!("network:{}:detach", network_id);
            if let Err(e) = self
                .terminal
                .exec_command(container.proxmox_ctid, &key_id, &cmd)
                .await
            {
                warn!(
                    member_id = %member.id,
                    error = %e.message,
                    "SSH deconfigure failed on remove; proceeding with NIC detach"
                );
            }
        }

        // Detach NIC from Proxmox config
        if let Err(e) = self
            .proxmox
            .detach_container_nic(container.proxmox_ctid, member.net_index as u8)
            .await
        {
            warn!(
                member_id = %member.id,
                error = %e.message,
                "Proxmox NIC detach failed; membership left in 'detaching' state"
            );
            let _ = self
                .network_repo
                .update_member_state(member.id, MembershipState::Failed)
                .await;
            return Err(e);
        }

        // Delete the membership row (this frees the IP)
        self.network_repo
            .delete_member(network_id, container_id)
            .await?;

        self.audit
            .log_success(Some(actor.user_id), Some(container_id), "network.member.remove")
            .await;
        info!(
            network_id = %network_id,
            container_id = %container_id,
            "container removed from private network"
        );
        Ok(())
    }
}


