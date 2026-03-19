//! Container lifecycle orchestration and authorization checks.

use std::sync::Arc;

use chrono::Utc;
use tracing::warn;
use uuid::Uuid;

use crate::{
    auth::context::AuthenticatedUser,
    db::container_repo::ContainerRepo,
    models::container::{AccessLevel, ContainerRecord, ContainerState, CreateContainerResult},
    proxmox::{
        client::ProxmoxClient,
        types::{ContainerMetrics, CreateContainerRequest},
    },
    services::audit_service::AuditService,
    utils::error::ApiError,
};

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
    ) -> Result<CreateContainerResult, ApiError> {
        let node_name = request.node_name.clone();
        let hostname = request.hostname.clone();
        let ctid = self.proxmox.create_container(request).await?;

        let record = ContainerRecord {
            id: Uuid::new_v4(),
            proxmox_ctid: ctid,
            name: hostname,
            node_name,
            state: ContainerState::Provisioning,
            created_at: Utc::now(),
        };
        self.containers.create(&record, actor.user_id).await?;
        self.audit
            .log_success(Some(actor.user_id), Some(record.id), "container.create")
            .await;

        // Attempt to start the container and transition to Running.
        match self.proxmox.start_container(ctid).await {
            Ok(()) => {
                self.containers
                    .update_state(record.id, ContainerState::Running)
                    .await?;
            }
            Err(e) => {
                warn!(ctid, error = %e.message, "failed to auto-start container after creation");
                self.containers
                    .update_state(record.id, ContainerState::Failed)
                    .await?;
            }
        }

        // Re-fetch to return the updated state.
        let container = self
            .containers
            .get(record.id)
            .await?
            .ok_or_else(|| ApiError::internal("container disappeared after creation"))?;

        Ok(CreateContainerResult {
            container,
            initial_password: None,
        })
    }

    /// Starts a container after ownership is validated.
    pub async fn start(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
    ) -> Result<(), ApiError> {
        let container = self.get(actor, container_id).await?;
        self.require_access(actor, container_id, AccessLevel::Operator)
            .await?;
        self.proxmox.start_container(container.proxmox_ctid).await?;
        self.containers
            .update_state(container_id, ContainerState::Running)
            .await?;
        self.audit
            .log_success(Some(actor.user_id), Some(container_id), "container.start")
            .await;
        Ok(())
    }

    /// Stops a container after ownership is validated.
    pub async fn stop(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
    ) -> Result<(), ApiError> {
        let container = self.get(actor, container_id).await?;
        self.require_access(actor, container_id, AccessLevel::Operator)
            .await?;
        self.proxmox.stop_container(container.proxmox_ctid).await?;
        self.containers
            .update_state(container_id, ContainerState::Stopped)
            .await?;
        self.audit
            .log_success(Some(actor.user_id), Some(container_id), "container.stop")
            .await;
        Ok(())
    }

    /// Restarts a container after ownership is validated.
    pub async fn restart(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
    ) -> Result<(), ApiError> {
        let container = self.get(actor, container_id).await?;
        self.require_access(actor, container_id, AccessLevel::Operator)
            .await?;
        self.proxmox
            .restart_container(container.proxmox_ctid)
            .await?;
        self.containers
            .update_state(container_id, ContainerState::Running)
            .await?;
        self.audit
            .log_success(Some(actor.user_id), Some(container_id), "container.restart")
            .await;
        Ok(())
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
    async fn require_access(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
        minimum: AccessLevel,
    ) -> Result<(), ApiError> {
        if actor.role == crate::models::user::UserRole::Admin {
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


