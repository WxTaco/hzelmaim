//! Terminal session event shapes for WebSocket-based terminal streaming.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Open request describing the target terminal session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalSessionRequest {
    pub container_id: Uuid,
    pub cols: u16,
    pub rows: u16,
}

/// Events sent from the backend to the frontend over WebSocket.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TerminalStreamEvent {
    Opened { container_id: Uuid },
    Output { data: String },
    Resized { cols: u16, rows: u16 },
    Closed,
    Error { message: String },
    /// A file upload completed successfully.
    FileUploaded { path: String },
    /// A file upload failed.
    FileUploadError { path: String, message: String },
}

/// Messages sent from the frontend to the backend over WebSocket.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TerminalClientMsg {
    /// Raw terminal input from the user.
    Input { data: String },
    /// Terminal resize event.
    Resize { cols: u16, rows: u16 },
    /// Upload a file into the container. `data` is the file content encoded as
    /// standard Base64. `path` is the absolute destination path inside the
    /// container (e.g. `/root/myfile.txt`).
    FileUpload { path: String, data: String },
}
