//! Container lifecycle orchestration and authorization checks.

use std::{sync::Arc, time::Duration};

use chrono::Utc;
use tokio::time::sleep;
use tracing::warn;
use uuid::Uuid;

use crate::{
    auth::context::AuthenticatedUser,
    db::container_repo::ContainerRepo,
    models::container::{AccessLevel, ContainerRecord, ContainerState},
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

    /// Lists containers visible to the current actor.
    pub async fn list_for_user(
        &self,
        actor: &AuthenticatedUser,
    ) -> Result<Vec<ContainerRecord>, ApiError> {
        self.containers.list_for_user(actor.user_id).await
    }

    /// Loads a single container by id with access check.
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
        self.require_access(actor, container_id, AccessLevel::Viewer)
            .await?;
        Ok(container)
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
        self.require_access(actor, container_id, AccessLevel::Operator)
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
        self.require_access(actor, container_id, AccessLevel::Operator)
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
        self.require_access(actor, container_id, AccessLevel::Operator)
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

    /// Retrieves metrics for a container that belongs to the current actor.
    pub async fn metrics(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
    ) -> Result<ContainerMetrics, ApiError> {
        let container = self.get(actor, container_id).await?;
        self.proxmox.container_metrics(container.proxmox_ctid).await
    }

    /// Returns a reference to the container repo (used by background sync).
    pub fn repo(&self) -> &Arc<dyn ContainerRepo> {
        &self.containers
    }

    /// Returns a reference to the Proxmox client (used by background sync).
    pub fn proxmox(&self) -> &Arc<dyn ProxmoxClient> {
        &self.proxmox
    }

    /// Checks that the actor has the required access level to a container.
    ///
    /// Admins bypass the ownership check unless the request is authenticated
    /// via an OAuth application token, which is always restricted to the
    /// authorizing user's own resources.
    async fn require_access(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
        minimum: AccessLevel,
    ) -> Result<(), ApiError> {
        if actor.effective_role() == &crate::models::user::UserRole::Admin {
            return Ok(());
        }
        let has_access = self
            .containers
            .check_access(container_id, actor.user_id, minimum)
            .await?;
        if !has_access {
            return Err(ApiError::forbidden(
                "You do not have access to this container",
            ));
        }
        Ok(())
    }
}


