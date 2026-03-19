//! In-memory command queue skeleton used by the command execution service.

use std::{collections::HashMap, sync::Arc};

use chrono::Utc;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::models::command::{CommandExecutionRecord, CommandExecutionStatus};

/// Job event types that will later be streamed over WebSocket connections.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum JobEvent {
    Queued {
        job_id: Uuid,
    },
    Output {
        job_id: Uuid,
        stream: String,
        chunk: String,
    },
    Finished {
        job_id: Uuid,
        success: bool,
    },
}

/// Lightweight in-memory queue suitable for initial scaffolding.
#[derive(Debug, Default)]
pub struct InMemoryCommandQueue {
    jobs: Arc<RwLock<HashMap<Uuid, CommandExecutionRecord>>>,
}

impl InMemoryCommandQueue {
    /// Creates a new in-memory command queue.
    pub fn new() -> Self {
        Self::default()
    }

    /// Stores a queued job and returns the resulting record.
    pub async fn enqueue(&self, mut record: CommandExecutionRecord) -> CommandExecutionRecord {
        record.status = CommandExecutionStatus::Queued;
        record.created_at = Utc::now();
        self.jobs.write().await.insert(record.id, record.clone());
        record
    }

    /// Retrieves a previously queued job.
    pub async fn get(&self, id: Uuid) -> Option<CommandExecutionRecord> {
        self.jobs.read().await.get(&id).cloned()
    }
}
