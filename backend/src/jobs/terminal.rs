//! Terminal session event shapes for future xterm.js integration.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Open request describing the target terminal session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalSessionRequest {
    pub container_id: Uuid,
    pub cols: u16,
    pub rows: u16,
}

/// Events sent over the terminal WebSocket channel.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TerminalStreamEvent {
    Opened { container_id: Uuid },
    Output { data: String },
    Resized { cols: u16, rows: u16 },
    Closed,
}
