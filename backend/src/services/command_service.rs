//! Command queuing and sanitization service.

use std::sync::Arc;

use chrono::Utc;
use uuid::Uuid;

use crate::{
    auth::context::AuthenticatedUser,
    db::command_repo::CommandRepo,
    models::command::{CommandExecutionRecord, CommandExecutionStatus},
    services::audit_service::AuditService,
    utils::error::ApiError,
};

/// Typed command request that avoids shell interpolation.
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct CommandRequest {
    pub container_id: Uuid,
    pub program: String,
    pub args: Vec<String>,
}

/// Service responsible for validating and queuing command jobs.
pub struct CommandService {
    commands: Arc<dyn CommandRepo>,
    audit: Arc<AuditService>,
}

impl CommandService {
    /// Creates a new command service.
    pub fn new(commands: Arc<dyn CommandRepo>, audit: Arc<AuditService>) -> Self {
        Self { commands, audit }
    }

    /// Validates command input and enqueues it for asynchronous execution.
    pub async fn enqueue(&self, actor: &AuthenticatedUser, request: CommandRequest) -> Result<CommandExecutionRecord, ApiError> {
        validate_token(&request.program)?;
        request.args.iter().try_for_each(|arg| validate_token(arg))?;

        let record = CommandExecutionRecord {
            id: Uuid::new_v4(),
            container_id: request.container_id,
            requested_by: actor.user_id,
            program: request.program,
            args: request.args,
            status: CommandExecutionStatus::Queued,
            stdout: String::new(),
            stderr: String::new(),
            created_at: Utc::now(),
        };

        self.commands.insert(&record).await?;
        self.audit.log_success(Some(actor.user_id), Some(record.container_id), "command.enqueue").await;
        Ok(record)
    }

    /// Retrieves a previously queued command job.
    pub async fn get(&self, job_id: Uuid) -> Result<CommandExecutionRecord, ApiError> {
        self.commands.get(job_id).await?.ok_or_else(|| ApiError::command_not_found(job_id.to_string()))
    }
}

/// Ensures command components remain tokenized and shell-safe.
fn validate_token(token: &str) -> Result<(), ApiError> {
    let allowed = "_-./:=@";
    if !token.is_empty() && token.chars().all(|c| c.is_ascii_alphanumeric() || allowed.contains(c)) {
        Ok(())
    } else {
        Err(ApiError::validation("Command tokens may only contain safe non-shell characters"))
    }
}
