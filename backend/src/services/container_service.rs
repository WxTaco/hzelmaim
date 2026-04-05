//! Container lifecycle orchestration and authorization checks.

use std::{sync::Arc, time::Duration};

use chrono::Utc;
use tokio::time::sleep;
use tracing::warn;
use uuid::Uuid;

use crate::{
    auth::context::AuthenticatedUser,
    db::container_repo::ContainerRepo,
    models::container::{
        ContainerInvitation, ContainerRecord, ContainerState, ContainerWithPermissions,
        PendingContainerInvitationView, Permissions, PERM_READ_METRICS, PERM_SHARE,
        PERM_START_STOP, PERM_VIEW, PRESET_OWNER,
    },
    proxmox::{
        client::ProxmoxClient,
        types::{ContainerMetrics, ContainerRuntimeStatus, CreateContainerRequest},
    },
    services::audit_service::AuditService,
    utils::error::ApiError,
};

/// How long to wait between Proxmox status polls after a lifecycle action.
const STATE_POLL_INTERVAL: Duration = Duration::from_secs(2);
/// Maximum time to wait for a state transition before giving up.
/// 120 s gives containers ample time to boot after provisioning.
const STATE_POLL_TIMEOUT: Duration = Duration::from_secs(120);

/// Service responsible for validating and orchestrating container actions.
pub struct ContainerService {
    proxmox: Arc<dyn ProxmoxClient>,
    containers: Arc<dyn ContainerRepo>,
    audit: Arc<AuditService>,
}

impl ContainerService {
    /// Creates a new container service.
    pub fn new(
        proxmox: Arc<dyn ProxmoxClient>,
        containers: Arc<dyn ContainerRepo>,
        audit: Arc<AuditService>,
    ) -> Self {
        Self {
            proxmox,
            containers,
            audit,
        }
    }

    /// Lists containers visible to the current actor, each annotated with the
    /// actor's permission bitmask for that container.
    pub async fn list_for_user(
        &self,
        actor: &AuthenticatedUser,
    ) -> Result<Vec<ContainerWithPermissions>, ApiError> {
        self.containers.list_for_user(actor.user_id).await
    }

    /// Loads a single container by id, gated on `PERM_VIEW`.
    pub async fn get(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
    ) -> Result<ContainerRecord, ApiError> {
        let container = self
            .containers
            .get(container_id)
            .await?
            .ok_or_else(|| ApiError::container_not_found(container_id.to_string()))?;
        self.require_permission(actor, container_id, PERM_VIEW)
            .await?;
        Ok(container)
    }

    /// Returns the full permission bitmask the actor holds for `container_id`.
    ///
    /// Admins receive `PRESET_OWNER` (all bits set) without a DB round-trip.
    pub async fn get_permissions_for_user(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
    ) -> Result<Permissions, ApiError> {
        if actor.effective_role() == &crate::models::user::UserRole::Admin {
            return Ok(Permissions(PRESET_OWNER));
        }
        self.containers
            .get_permissions(container_id, actor.user_id)
            .await
    }

    /// Verifies that `actor` holds the given permission bit for `container_id`.
    ///
    /// Admins bypass the check.  Returns 403 when the bit is not set.
    pub async fn require_permission(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
        flag: i32,
    ) -> Result<(), ApiError> {
        if actor.effective_role() == &crate::models::user::UserRole::Admin {
            return Ok(());
        }
        let perms = self
            .containers
            .get_permissions(container_id, actor.user_id)
            .await?;
        if !perms.has(flag) {
            return Err(ApiError::forbidden(
                "You do not have permission to perform this action on the container",
            ));
        }
        Ok(())
    }

    /// Creates and starts a container.
    ///
    /// The container template is expected to have `openssh-server` installed,
    /// sshd enabled, and `TrustedUserCAKeys /etc/ssh/trusted_ca_keys.pub`
    /// already configured so that ephemeral CA-signed certificates from
    /// [`crate::services::terminal_service::TerminalService`] are accepted.
    pub async fn create(
        &self,
        actor: &AuthenticatedUser,
        request: CreateContainerRequest,
    ) -> Result<ContainerRecord, ApiError> {
        let node_name = request.node_name.clone();
        let hostname = request.hostname.clone();
        // Capture limits before the request is moved into the Proxmox call.
        let cpu_cores = request.resource_limits.cpu_cores as i16;
        let memory_mb = request.resource_limits.memory_mb as i32;
        let disk_gb = request.resource_limits.disk_gb as i32;

        let ctid = self.proxmox.create_container(request).await?;

        let record = ContainerRecord {
            id: Uuid::new_v4(),
            proxmox_ctid: ctid,
            name: hostname,
            node_name,
            cpu_cores,
            memory_mb,
            disk_gb,
            state: ContainerState::Provisioning,
            created_at: Utc::now(),
        };
        self.containers.create(&record, actor.user_id).await?;
        self.audit
            .log_success(Some(actor.user_id), Some(record.id), "container.create")
            .await;

        // Attempt to start the container and poll until Proxmox confirms it is
        // actually running (mirrors the verified-transition logic in `start`).
        let new_state = match self.proxmox.start_container(ctid).await {
            Ok(()) => {
                match self
                    .poll_for_state(ctid, ContainerRuntimeStatus::Running)
                    .await
                {
                    ContainerRuntimeStatus::Running => ContainerState::Running,
                    _ => {
                        warn!(
                            ctid,
                            "create: container did not reach Running within timeout; marking Failed"
                        );
                        ContainerState::Failed
                    }
                }
            }
            Err(e) => {
                warn!(ctid, error = %e.message, "failed to auto-start container after creation");
                ContainerState::Failed
            }
        };
        self.containers.update_state(record.id, new_state).await?;

        // Re-fetch to return the final state.
        self.containers
            .get(record.id)
            .await?
            .ok_or_else(|| ApiError::internal("container disappeared after creation"))
    }

    /// Starts a container after ownership is validated.
    ///
    /// Issues the start command to Proxmox, then polls until the container
    /// reports `Running` or until the poll timeout is exceeded. The DB state
    /// is updated to reflect the verified outcome: `Running` on success or
    /// `Failed` if the transition could not be confirmed.
    pub async fn start(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
    ) -> Result<ContainerRecord, ApiError> {
        let container = self.get(actor, container_id).await?;
        self.require_permission(actor, container_id, PERM_START_STOP)
            .await?;
        self.proxmox.start_container(container.proxmox_ctid).await?;

        let actual = self
            .poll_for_state(container.proxmox_ctid, ContainerRuntimeStatus::Running)
            .await;
        let new_state = match actual {
            ContainerRuntimeStatus::Running => ContainerState::Running,
            _ => {
                warn!(
                    ctid = container.proxmox_ctid,
                    "start: container did not reach Running state within timeout; marking as Failed"
                );
                ContainerState::Failed
            }
        };
        self.containers.update_state(container_id, new_state).await?;
        self.audit
            .log_success(Some(actor.user_id), Some(container_id), "container.start")
            .await;
        self.containers
            .get(container_id)
            .await?
            .ok_or_else(|| ApiError::internal("container disappeared after start"))
    }

    /// Stops a container after ownership is validated.
    ///
    /// Issues the stop command to Proxmox, then polls until the container
    /// reports `Stopped` or until the poll timeout is exceeded. The DB state
    /// is updated to reflect the verified outcome: `Stopped` on success or
    /// `Failed` if the transition could not be confirmed.
    pub async fn stop(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
    ) -> Result<ContainerRecord, ApiError> {
        let container = self.get(actor, container_id).await?;
        self.require_permission(actor, container_id, PERM_START_STOP)
            .await?;
        self.proxmox.stop_container(container.proxmox_ctid).await?;

        let actual = self
            .poll_for_state(container.proxmox_ctid, ContainerRuntimeStatus::Stopped)
            .await;
        let new_state = match actual {
            ContainerRuntimeStatus::Stopped => ContainerState::Stopped,
            _ => {
                warn!(
                    ctid = container.proxmox_ctid,
                    "stop: container did not reach Stopped state within timeout; marking as Failed"
                );
                ContainerState::Failed
            }
        };
        self.containers.update_state(container_id, new_state).await?;
        self.audit
            .log_success(Some(actor.user_id), Some(container_id), "container.stop")
            .await;
        self.containers
            .get(container_id)
            .await?
            .ok_or_else(|| ApiError::internal("container disappeared after stop"))
    }

    /// Restarts a container after ownership is validated.
    ///
    /// Issues the restart command to Proxmox, then polls until the container
    /// reports `Running` or until the poll timeout is exceeded. The DB state
    /// is updated to reflect the verified outcome: `Running` on success or
    /// `Failed` if the transition could not be confirmed.
    pub async fn restart(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
    ) -> Result<ContainerRecord, ApiError> {
        let container = self.get(actor, container_id).await?;
        self.require_permission(actor, container_id, PERM_START_STOP)
            .await?;
        self.proxmox
            .restart_container(container.proxmox_ctid)
            .await?;

        let actual = self
            .poll_for_state(container.proxmox_ctid, ContainerRuntimeStatus::Running)
            .await;
        let new_state = match actual {
            ContainerRuntimeStatus::Running => ContainerState::Running,
            _ => {
                warn!(
                    ctid = container.proxmox_ctid,
                    "restart: container did not reach Running state within timeout; marking as Failed"
                );
                ContainerState::Failed
            }
        };
        self.containers.update_state(container_id, new_state).await?;
        self.audit
            .log_success(Some(actor.user_id), Some(container_id), "container.restart")
            .await;
        self.containers
            .get(container_id)
            .await?
            .ok_or_else(|| ApiError::internal("container disappeared after restart"))
    }

    /// Polls Proxmox every [`STATE_POLL_INTERVAL`] until the container reaches
    /// `desired` or [`STATE_POLL_TIMEOUT`] elapses.
    ///
    /// Returns the last observed [`ContainerRuntimeStatus`]. On a Proxmox
    /// communication error the poll is abandoned and `Unknown` is returned so
    /// that callers can mark the container as `Failed` rather than silently
    /// leaving state stale.
    async fn poll_for_state(
        &self,
        ctid: i32,
        desired: ContainerRuntimeStatus,
    ) -> ContainerRuntimeStatus {
        let start = tokio::time::Instant::now();
        loop {
            match self.proxmox.container_status(ctid).await {
                Ok(status) if status == desired => return status,
                Ok(_) => {}
                Err(e) => {
                    warn!(
                        ctid,
                        error = %e.message,
                        "poll_for_state: error querying Proxmox; aborting poll"
                    );
                    return ContainerRuntimeStatus::Unknown;
                }
            }
            if start.elapsed() >= STATE_POLL_TIMEOUT {
                warn!(
                    ctid,
                    desired = ?desired,
                    timeout_secs = STATE_POLL_TIMEOUT.as_secs(),
                    "poll_for_state: timed out waiting for state transition"
                );
                return ContainerRuntimeStatus::Unknown;
            }
            sleep(STATE_POLL_INTERVAL).await;
        }
    }

    /// Retrieves metrics for a container, gated on `PERM_READ_METRICS`.
    pub async fn metrics(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
    ) -> Result<ContainerMetrics, ApiError> {
        let container = self.get(actor, container_id).await?;
        self.require_permission(actor, container_id, PERM_READ_METRICS)
            .await?;
        self.proxmox.container_metrics(container.proxmox_ctid).await
    }

    // ── Container sharing ────────────────────────────────────────────────────

    /// Invites `email` to share `container_id` with the specified permission bitmask.
    ///
    /// Only users who hold `PERM_SHARE` may send invitations.  The requested
    /// `permissions` must be a subset of the actor's own permissions — you
    /// cannot grant rights you do not hold — and must always include `PERM_VIEW`
    /// (otherwise the invitee would not be able to see the container at all).
    ///
    /// Returns an error when the email address does not belong to a registered user.
    pub async fn invite_by_email(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
        email: String,
        permissions: i32,
    ) -> Result<ContainerInvitation, ApiError> {
        // Only users with PERM_SHARE may invite.
        self.require_permission(actor, container_id, PERM_SHARE).await?;

        // PERM_VIEW must always be included — without it the invitee's container
        // would be invisible.
        if permissions & PERM_VIEW == 0 {
            return Err(ApiError::bad_request(
                "permissions must include PERM_VIEW (bit 1) so the invitee can see the container",
            ));
        }

        // Prevent privilege escalation: the granted mask must be a strict subset
        // of what the actor themselves holds.
        let actor_perms = self
            .get_permissions_for_user(actor, container_id)
            .await?;
        if permissions & actor_perms.0 != permissions {
            return Err(ApiError::forbidden(
                "You cannot grant permissions you do not hold on this container",
            ));
        }

        // Resolve the email to a user_id.
        let user_id = self
            .containers
            .find_user_by_email(&email)
            .await?
            .ok_or_else(|| ApiError::not_found("No user found with that email address"))?;

        let inv = ContainerInvitation {
            id: Uuid::new_v4(),
            container_id,
            user_id,
            invited_by: actor.user_id,
            invited_at: chrono::Utc::now(),
            responded_at: None,
            response: None,
            permissions,
        };
        self.containers.create_container_invitation(&inv).await?;
        Ok(inv)
    }

    /// Returns all unanswered container-sharing invitations for the current user.
    pub async fn pending_invitations(
        &self,
        actor: &AuthenticatedUser,
    ) -> Result<Vec<PendingContainerInvitationView>, ApiError> {
        self.containers.pending_container_invitations(actor.user_id).await
    }

    /// Records the authenticated user's response to a container-sharing invitation.
    ///
    /// Returns 403 if the invitation belongs to a different user.
    /// When accepted, the invitee is granted `viewer` access to the container.
    pub async fn respond_to_invitation(
        &self,
        actor: &AuthenticatedUser,
        invitation_id: Uuid,
        response: String,
    ) -> Result<(), ApiError> {
        if response != "accepted" && response != "declined" {
            return Err(ApiError::bad_request(
                r#"response must be "accepted" or "declined""#,
            ));
        }

        let inv = self
            .containers
            .get_container_invitation(invitation_id)
            .await?
            .ok_or_else(|| ApiError::not_found("Invitation not found"))?;

        if inv.user_id != actor.user_id {
            return Err(ApiError::forbidden(
                "This invitation does not belong to you",
            ));
        }

        self.containers
            .respond_to_container_invitation(
                invitation_id,
                inv.container_id,
                actor.user_id,
                &response,
                inv.permissions,
            )
            .await
    }

    /// Returns a reference to the container repo (used by background sync).
    pub fn repo(&self) -> &Arc<dyn ContainerRepo> {
        &self.containers
    }

    /// Returns a reference to the Proxmox client (used by background sync).
    pub fn proxmox(&self) -> &Arc<dyn ProxmoxClient> {
        &self.proxmox
    }

}


