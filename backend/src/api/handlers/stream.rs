//! WebSocket handlers for jobs and terminal sessions.

use axum::{extract::{ws::WebSocket, Path, WebSocketUpgrade}, response::Response};
use uuid::Uuid;

/// Opens a command-output stream for a specific job.
pub async fn job_stream(Path(job_id): Path<Uuid>, ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(move |socket| async move { handle_idle_socket(socket, job_id).await })
}

/// Opens a future interactive terminal stream for a container.
pub async fn terminal_stream(Path(container_id): Path<Uuid>, ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(move |socket| async move { handle_idle_socket(socket, container_id).await })
}

async fn handle_idle_socket(_socket: WebSocket, _resource_id: Uuid) {
    // Placeholder for broadcast subscriptions and xterm.js-compatible streaming.
}
