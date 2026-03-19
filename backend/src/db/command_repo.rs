//! PostgreSQL-backed command execution persistence.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    db::Pool,
    models::command::{CommandExecutionRecord, CommandExecutionStatus},
    utils::error::ApiError,
};

/// Persistence boundary for command execution records.
#[async_trait]
pub trait CommandRepo: Send + Sync {
    /// Inserts a new command execution record.
    async fn insert(&self, record: &CommandExecutionRecord) -> Result<(), ApiError>;

    /// Loads a command execution record by id.
    async fn get(&self, job_id: Uuid) -> Result<Option<CommandExecutionRecord>, ApiError>;

    /// Updates the status, stdout, and stderr of a command execution.
    async fn update_result(
        &self,
        job_id: Uuid,
        status: CommandExecutionStatus,
        stdout: &str,
        stderr: &str,
    ) -> Result<(), ApiError>;

    /// Lists command executions for a container ordered by creation time.
    async fn list_for_container(
        &self,
        container_id: Uuid,
    ) -> Result<Vec<CommandExecutionRecord>, ApiError>;
}

/// PostgreSQL implementation of the command repository.
pub struct PgCommandRepo {
    pool: Pool,
}

impl PgCommandRepo {
    /// Creates a new PostgreSQL command repository.
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

#[derive(sqlx::FromRow)]
struct CommandRow {
    id: Uuid,
    container_id: Uuid,
    requested_by: Uuid,
    program: String,
    args: serde_json::Value,
    status: String,
    stdout: String,
    stderr: String,
    created_at: DateTime<Utc>,
}

fn parse_status(s: &str) -> CommandExecutionStatus {
    match s {
        "running" => CommandExecutionStatus::Running,
        "succeeded" => CommandExecutionStatus::Succeeded,
        "failed" => CommandExecutionStatus::Failed,
        "cancelled" => CommandExecutionStatus::Cancelled,
        _ => CommandExecutionStatus::Queued,
    }
}

fn status_str(s: &CommandExecutionStatus) -> &'static str {
    match s {
        CommandExecutionStatus::Queued => "queued",
        CommandExecutionStatus::Running => "running",
        CommandExecutionStatus::Succeeded => "succeeded",
        CommandExecutionStatus::Failed => "failed",
        CommandExecutionStatus::Cancelled => "cancelled",
    }
}

impl From<CommandRow> for CommandExecutionRecord {
    fn from(row: CommandRow) -> Self {
        let args: Vec<String> = serde_json::from_value(row.args).unwrap_or_default();
        Self {
            id: row.id,
            container_id: row.container_id,
            requested_by: row.requested_by,
            program: row.program,
            args,
            status: parse_status(&row.status),
            stdout: row.stdout,
            stderr: row.stderr,
            created_at: row.created_at,
        }
    }
}

#[async_trait]
impl CommandRepo for PgCommandRepo {
    async fn insert(&self, record: &CommandExecutionRecord) -> Result<(), ApiError> {
        let args_json = serde_json::to_value(&record.args).unwrap_or_default();
        sqlx::query(
            "INSERT INTO command_execution_logs (id, container_id, requested_by, program, args, status, stdout, stderr, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        )
        .bind(record.id)
        .bind(record.container_id)
        .bind(record.requested_by)
        .bind(&record.program)
        .bind(&args_json)
        .bind(status_str(&record.status))
        .bind(&record.stdout)
        .bind(&record.stderr)
        .bind(record.created_at)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn get(&self, job_id: Uuid) -> Result<Option<CommandExecutionRecord>, ApiError> {
        let row = sqlx::query_as::<_, CommandRow>(
            "SELECT id, container_id, requested_by, program, args, status, stdout, stderr, created_at FROM command_execution_logs WHERE id = $1",
        )
        .bind(job_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.map(Into::into))
    }

    async fn update_result(
        &self,
        job_id: Uuid,
        status: CommandExecutionStatus,
        stdout: &str,
        stderr: &str,
    ) -> Result<(), ApiError> {
        sqlx::query(
            "UPDATE command_execution_logs SET status = $1, stdout = $2, stderr = $3 WHERE id = $4",
        )
        .bind(status_str(&status))
        .bind(stdout)
        .bind(stderr)
        .bind(job_id)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn list_for_container(
        &self,
        container_id: Uuid,
    ) -> Result<Vec<CommandExecutionRecord>, ApiError> {
        let rows = sqlx::query_as::<_, CommandRow>(
            "SELECT id, container_id, requested_by, program, args, status, stdout, stderr, created_at FROM command_execution_logs WHERE container_id = $1 ORDER BY created_at DESC",
        )
        .bind(container_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(rows.into_iter().map(Into::into).collect())
    }
}
