//! Webhook auto-deployment service — handles inbound events and fires SSH deployments.

use std::sync::Arc;

use chrono::Utc;
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::{
    auth::context::AuthenticatedUser,
    db::{
        container_repo::ContainerRepo,
        webhook_repo::WebhookRepo,
    },
    models::{
        container::PERM_WEBHOOKS,
        webhook::{
            CreateWebhookConfigRequest, DeliveryStatus, UpdateWebhookConfigRequest,
            WebhookConfig, WebhookDelivery,
        },
    },
    services::terminal_service::TerminalService,
    utils::error::ApiError,
    webhooks::{
        provider::WebhookEventType,
        registry::ProviderRegistry,
    },
};

use axum::http::HeaderMap;

/// Orchestrates webhook config CRUD, inbound event handling, and SSH-based deployments.
pub struct WebhookService {
    repo: Arc<dyn WebhookRepo>,
    container_repo: Arc<dyn ContainerRepo>,
    terminal_service: Arc<TerminalService>,
    provider_registry: Arc<ProviderRegistry>,
}

impl WebhookService {
    pub fn new(
        repo: Arc<dyn WebhookRepo>,
        container_repo: Arc<dyn ContainerRepo>,
        terminal_service: Arc<TerminalService>,
        provider_registry: Arc<ProviderRegistry>,
    ) -> Self {
        Self {
            repo,
            container_repo,
            terminal_service,
            provider_registry,
        }
    }

    // -------------------------------------------------------------------------
    // Input validation helpers
    // -------------------------------------------------------------------------

    fn validate_branch(branch: &str) -> Result<(), ApiError> {
        if branch.is_empty() {
            return Err(ApiError::validation("branch must not be empty"));
        }
        if branch.len() > 255 {
            return Err(ApiError::validation("branch must not exceed 255 bytes"));
        }
        if branch.bytes().any(|b| b == b'\0' || b == b'\'' || b < 0x20) {
            return Err(ApiError::validation(
                "branch contains invalid characters (null bytes, single quotes, or control characters)",
            ));
        }
        let valid = branch.bytes().all(|b| {
            b.is_ascii_alphanumeric() || b == b'.' || b == b'_' || b == b'/' || b == b'-'
        });
        if !valid {
            return Err(ApiError::validation(
                "branch must match [a-zA-Z0-9._/\\-]+",
            ));
        }
        Ok(())
    }

    fn validate_working_dir(dir: &str) -> Result<(), ApiError> {
        if dir.is_empty() {
            return Err(ApiError::validation("working_dir must not be empty"));
        }
        if dir.len() > 4096 {
            return Err(ApiError::validation("working_dir must not exceed 4096 bytes"));
        }
        if dir.bytes().any(|b| b == b'\0' || b == b'\'') {
            return Err(ApiError::validation(
                "working_dir must not contain null bytes or single quotes",
            ));
        }
        if !dir.starts_with('/') {
            return Err(ApiError::validation("working_dir must start with '/'"));
        }
        Ok(())
    }

    fn validate_create(req: &CreateWebhookConfigRequest) -> Result<(), ApiError> {
        Self::validate_branch(&req.branch)?;
        Self::validate_working_dir(&req.working_dir)?;
        if req.post_pull_cmd.len() > 4096 {
            return Err(ApiError::validation("post_pull_cmd must not exceed 4096 bytes"));
        }
        if req.webhook_secret.len() < 16 || req.webhook_secret.len() > 512 {
            return Err(ApiError::validation(
                "webhook_secret must be between 16 and 512 bytes",
            ));
        }
        Ok(())
    }

    fn validate_update(req: &UpdateWebhookConfigRequest) -> Result<(), ApiError> {
        if req.provider.is_none()
            && req.webhook_secret.is_none()
            && req.branch.is_none()
            && req.working_dir.is_none()
            && req.post_pull_cmd.is_none()
        {
            return Err(ApiError::validation("at least one field must be provided"));
        }
        if let Some(b) = &req.branch {
            Self::validate_branch(b)?;
        }
        if let Some(d) = &req.working_dir {
            Self::validate_working_dir(d)?;
        }
        if let Some(s) = &req.webhook_secret {
            if s.len() < 16 || s.len() > 512 {
                return Err(ApiError::validation(
                    "webhook_secret must be between 16 and 512 bytes",
                ));
            }
        }
        if let Some(c) = &req.post_pull_cmd {
            if c.len() > 4096 {
                return Err(ApiError::validation("post_pull_cmd must not exceed 4096 bytes"));
            }
        }
        Ok(())
    }


    // -------------------------------------------------------------------------
    // CRUD — container-scoped, access-checked
    // -------------------------------------------------------------------------

    /// Creates a webhook config for a container. Requires `PERM_WEBHOOKS`.
    pub async fn create_config(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
        req: CreateWebhookConfigRequest,
    ) -> Result<WebhookConfig, ApiError> {
        self.require_permission(actor, container_id, PERM_WEBHOOKS).await?;
        Self::validate_create(&req)?;

        let now = Utc::now();
        let cfg = WebhookConfig {
            id: Uuid::new_v4(),
            container_id,
            provider: req.provider,
            webhook_secret: req.webhook_secret,
            branch: req.branch,
            working_dir: req.working_dir,
            post_pull_cmd: req.post_pull_cmd,
            created_at: now,
            updated_at: now,
        };
        self.repo.create_config(&cfg).await?;
        Ok(cfg)
    }

    /// Lists webhook configs for a container. Requires `PERM_WEBHOOKS`.
    pub async fn list_configs(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
    ) -> Result<Vec<WebhookConfig>, ApiError> {
        self.require_permission(actor, container_id, PERM_WEBHOOKS).await?;
        self.repo.list_configs(container_id).await
    }

    /// Loads a single webhook config. Requires `PERM_WEBHOOKS`.
    pub async fn get_config(
        &self,
        actor: &AuthenticatedUser,
        webhook_id: Uuid,
    ) -> Result<WebhookConfig, ApiError> {
        let cfg = self.repo.get_config(webhook_id).await?
            .ok_or_else(|| ApiError::webhook_not_found(webhook_id.to_string()))?;
        self.require_permission(actor, cfg.container_id, PERM_WEBHOOKS).await?;
        Ok(cfg)
    }

    /// Updates a webhook config. Requires `PERM_WEBHOOKS`.
    pub async fn update_config(
        &self,
        actor: &AuthenticatedUser,
        webhook_id: Uuid,
        req: UpdateWebhookConfigRequest,
    ) -> Result<WebhookConfig, ApiError> {
        let cfg = self.repo.get_config(webhook_id).await?
            .ok_or_else(|| ApiError::webhook_not_found(webhook_id.to_string()))?;
        self.require_permission(actor, cfg.container_id, PERM_WEBHOOKS).await?;
        Self::validate_update(&req)?;
        self.repo.update_config(webhook_id, &req).await?;
        // Return refreshed config.
        self.repo.get_config(webhook_id).await?
            .ok_or_else(|| ApiError::webhook_not_found(webhook_id.to_string()))
    }

    /// Deletes a webhook config. Requires `PERM_WEBHOOKS`.
    pub async fn delete_config(
        &self,
        actor: &AuthenticatedUser,
        webhook_id: Uuid,
    ) -> Result<(), ApiError> {
        let cfg = self.repo.get_config(webhook_id).await?
            .ok_or_else(|| ApiError::webhook_not_found(webhook_id.to_string()))?;
        self.require_permission(actor, cfg.container_id, PERM_WEBHOOKS).await?;
        self.repo.delete_config(webhook_id).await
    }

    /// Lists delivery records for a webhook. Requires `PERM_WEBHOOKS`.
    pub async fn list_deliveries(
        &self,
        actor: &AuthenticatedUser,
        webhook_id: Uuid,
        limit: i64,
    ) -> Result<Vec<WebhookDelivery>, ApiError> {
        let cfg = self.repo.get_config(webhook_id).await?
            .ok_or_else(|| ApiError::webhook_not_found(webhook_id.to_string()))?;
        self.require_permission(actor, cfg.container_id, PERM_WEBHOOKS).await?;
        self.repo.list_deliveries(webhook_id, limit).await
    }

    // -------------------------------------------------------------------------
    // Inbound event handling
    // -------------------------------------------------------------------------

    /// Entry point for inbound webhook POST requests.
    ///
    /// Verifies the provider signature, logs the delivery, and fires an async
    /// deployment task without blocking the caller.
    pub async fn handle_incoming(
        &self,
        webhook_id: Uuid,
        headers: &HeaderMap,
        raw_body: &[u8],
    ) -> Result<(), ApiError> {
        // 1. Load config — 404 if missing.
        let config = self.repo.get_config(webhook_id).await?
            .ok_or_else(|| ApiError::webhook_not_found(webhook_id.to_string()))?;

        // 2. Resolve provider — 400 if unknown.
        let provider = self.provider_registry.get(&config.provider)
            .ok_or_else(|| ApiError::bad_request(format!(
                "Unknown provider: {}",
                config.provider
            )))?
            .clone();

        // 3. Verify signature — 401-class on failure.
        provider.verify(headers, raw_body, &config.webhook_secret)?;

        // 4. Parse event.
        let event = provider.parse_event(headers, raw_body)?;

        // 5. Insert delivery row with status = pending.
        let delivery = WebhookDelivery {
            id: Uuid::new_v4(),
            webhook_id: config.id,
            delivery_id: event.delivery_id.clone(),
            provider: config.provider.clone(),
            event_type: event.event_type.as_str().to_string(),
            branch: event.branch.clone(),
            head_commit_id: event.head_commit_id.clone(),
            status: DeliveryStatus::Pending,
            error_message: None,
            received_at: Utc::now(),
            completed_at: None,
        };
        self.repo.create_delivery(&delivery).await?;

        // 6. Ping — mark skipped and return immediately.
        if event.event_type == WebhookEventType::Ping {
            self.repo
                .update_delivery_status(delivery.id, DeliveryStatus::Skipped, None, None)
                .await?;
            return Ok(());
        }

        // 7. Wrong branch — mark skipped and return immediately.
        if event.branch != config.branch {
            info!(
                webhook_id = %webhook_id,
                pushed = %event.branch,
                configured = %config.branch,
                "Skipping delivery: branch mismatch"
            );
            self.repo
                .update_delivery_status(delivery.id, DeliveryStatus::Skipped, None, None)
                .await?;
            return Ok(());
        }

        // 8. Load container record for the SSH ctid.
        let container = self.container_repo.get(config.container_id).await?
            .ok_or_else(|| ApiError::container_not_found(config.container_id.to_string()))?;

        // 9. Mark running.
        self.repo
            .update_delivery_status(delivery.id, DeliveryStatus::Running, None, None)
            .await?;

        // 10. Spawn async deployment — return 200 immediately.
        let repo = Arc::clone(&self.repo);
        let terminal = Arc::clone(&self.terminal_service);
        tokio::spawn(async move {
            Self::run_deployment(repo, terminal, delivery, config, container.proxmox_ctid).await;
        });

        Ok(())
    }

    // -------------------------------------------------------------------------
    // Deployment runner (called from tokio::spawn)
    // -------------------------------------------------------------------------

    /// Executes the pull-and-restart command inside the container via SSH.
    ///
    /// Updates the delivery row to `succeeded` or `failed` with stdout/stderr context.
    async fn run_deployment(
        repo: Arc<dyn WebhookRepo>,
        terminal: Arc<TerminalService>,
        delivery: WebhookDelivery,
        config: WebhookConfig,
        ctid: i32,
    ) {
        // Build command: cd into working_dir then run post_pull_cmd.
        // working_dir is validated to contain no single quotes at config-save time.
        let cmd = format!("cd '{}' && {}", config.working_dir, config.post_pull_cmd);
        let key_id = format!("webhook:{}:deploy", config.id);

        let (status, err_msg) = match terminal.exec_command(ctid, &key_id, &cmd).await {
            Ok(output) => {
                if output.exit_code == 0 {
                    info!(
                        delivery_id = %delivery.id,
                        webhook_id = %config.id,
                        "Deployment succeeded"
                    );
                    (DeliveryStatus::Succeeded, None)
                } else {
                    let msg = format!(
                        "Command exited with code {}. stderr: {}",
                        output.exit_code, output.stderr
                    );
                    warn!(delivery_id = %delivery.id, err = %msg, "Deployment failed");
                    (DeliveryStatus::Failed, Some(msg))
                }
            }
            Err(e) => {
                error!(delivery_id = %delivery.id, err = %e.message, "Deployment SSH error");
                (DeliveryStatus::Failed, Some(e.message))
            }
        };

        let completed_at = Some(Utc::now());
        if let Err(e) = repo
            .update_delivery_status(
                delivery.id,
                status,
                err_msg.as_deref(),
                completed_at,
            )
            .await
        {
            error!(delivery_id = %delivery.id, err = %e.message, "Failed to update delivery status");
        }
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /// Verifies that `actor` holds `flag` in the container's permission bitmask.
    ///
    /// Admins always pass.  Returns 403 when the bit is absent.
    async fn require_permission(
        &self,
        actor: &AuthenticatedUser,
        container_id: Uuid,
        flag: i32,
    ) -> Result<(), ApiError> {
        if actor.effective_role() == &crate::models::user::UserRole::Admin {
            return Ok(());
        }
        let perms = self
            .container_repo
            .get_permissions(container_id, actor.user_id)
            .await?;
        if !perms.has(flag) {
            return Err(ApiError::forbidden(format!(
                "You do not have permission to perform this action on container {container_id}"
            )));
        }
        Ok(())
    }
}
