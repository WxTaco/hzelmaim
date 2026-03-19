//! WebSocket handlers for jobs and terminal sessions.

use axum::{
    extract::{
        ws::{Message, WebSocket},
        Path, Query, State, WebSocketUpgrade,
    },
    response::Response,
};
use futures::{SinkExt, StreamExt};
use serde::Deserialize;
use tokio::sync::mpsc;
use tracing::{error, warn};
use uuid::Uuid;

use crate::{
    app_state::AppState,
    auth::context::{validate_jwt_token, AuthenticatedUser},
    jobs::terminal::{TerminalClientMsg, TerminalStreamEvent},
    utils::error::ApiError,
};

/// Query parameters for WebSocket connections (JWT token).
#[derive(Debug, Deserialize)]
pub struct WsAuthQuery {
    pub token: Option<String>,
}

/// Opens a command-output stream for a specific job (still a placeholder).
pub async fn job_stream(Path(job_id): Path<Uuid>, ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(move |socket| async move { handle_idle_socket(socket, job_id).await })
}

async fn handle_idle_socket(_socket: WebSocket, _resource_id: Uuid) {
    // Placeholder for broadcast subscriptions.
}

/// Opens an interactive terminal stream for a container.
///
/// Accepts JWT token via query parameter: `/ws/terminal/{container_id}?token=<jwt>`
///
/// Protocol (JSON over WebSocket text frames):
///
/// **Client → Server:**
/// ```json
/// { "type": "input", "data": "ls\n" }
/// { "type": "resize", "cols": 120, "rows": 40 }
/// ```
///
/// **Server → Client:**
/// ```json
/// { "type": "opened", "container_id": "..." }
/// { "type": "output", "data": "total 42\n..." }
/// { "type": "closed" }
/// { "type": "error", "message": "..." }
/// ```
///
/// The first message from the client **must** be a resize to set initial
/// dimensions. If omitted, defaults of 80×24 are used.
pub async fn terminal_stream(
    Path(container_id): Path<Uuid>,
    Query(auth_query): Query<WsAuthQuery>,
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
) -> Result<Response, ApiError> {
    // Extract JWT token from query parameter
    let token = auth_query.token.ok_or_else(ApiError::unauthorized)?;

    // Validate JWT token and get authenticated user
    let user = validate_jwt_token(&token, &state.jwt_service, &state.user_repo).await?;

    Ok(ws.on_upgrade(move |socket| async move {
        if let Err(e) = handle_terminal(socket, container_id, user, state).await {
            warn!(error = %e, "terminal session ended with error");
        }
    }))
}

async fn handle_terminal(
    socket: WebSocket,
    container_id: Uuid,
    user: AuthenticatedUser,
    state: AppState,
) -> Result<(), String> {
    // Look up the container to get the Proxmox CTID and verify access.
    let container = state
        .container_service
        .get(&user, container_id)
        .await
        .map_err(|e| format!("container lookup failed: {}", e.message))?;

    let ctid = container.proxmox_ctid;

    // Split the WebSocket into reader/writer halves.
    let (mut ws_writer, mut ws_reader) = socket.split();

    // Channels bridging the WS halves to the terminal service.
    let (client_tx, client_rx) = mpsc::channel::<TerminalClientMsg>(64);
    let (server_tx, mut server_rx) = mpsc::channel::<TerminalStreamEvent>(64);

    // Wait for the first message to get initial dimensions (or use defaults).
    let (cols, rows) = match ws_reader.next().await {
        Some(Ok(Message::Text(text))) => {
            match serde_json::from_str::<TerminalClientMsg>(&text) {
                Ok(TerminalClientMsg::Resize { cols, rows }) => (cols, rows),
                Ok(msg) => {
                    // Forward the non-resize message and use defaults.
                    let _ = client_tx.send(msg).await;
                    (80, 24)
                }
                Err(e) => {
                    let _ = ws_writer
                        .send(Message::Text(
                            serde_json::to_string(&TerminalStreamEvent::Error {
                                message: format!("invalid message: {e}"),
                            })
                            .unwrap()
                            .into(),
                        ))
                        .await;
                    return Err(format!("bad first message: {e}"));
                }
            }
        }
        _ => (80, 24),
    };

    // Notify the client that the session is opening.
    let _ = server_tx
        .send(TerminalStreamEvent::Opened { container_id })
        .await;

    // Spawn the SSH bridge in a background task.
    let terminal_service = state.terminal_service.clone();
    let user_id = user.user_id;
    let error_tx = server_tx.clone();
    let bridge_handle = tokio::spawn(async move {
        if let Err(e) = terminal_service
            .open_session(user_id, ctid, cols, rows, client_rx, server_tx)
            .await
        {
            error!(error = %e.message, "terminal SSH session failed");
            let _ = error_tx
                .send(TerminalStreamEvent::Error { message: e.message })
                .await;
        }
    });

    // Spawn a task to forward server events to the WS writer.
    let writer_handle = tokio::spawn(async move {
        while let Some(event) = server_rx.recv().await {
            let json = match serde_json::to_string(&event) {
                Ok(j) => j,
                Err(_) => break,
            };
            if ws_writer.send(Message::Text(json.into())).await.is_err() {
                break;
            }
            // If the session closed, stop writing.
            if matches!(event, TerminalStreamEvent::Closed) {
                break;
            }
        }
    });

    // Read from the WS and forward to the SSH bridge via client_tx.
    while let Some(msg) = ws_reader.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                match serde_json::from_str::<TerminalClientMsg>(&text) {
                    Ok(client_msg) => {
                        if client_tx.send(client_msg).await.is_err() {
                            break; // SSH side closed
                        }
                    }
                    Err(e) => {
                        warn!("ignoring malformed WS message: {e}");
                    }
                }
            }
            Ok(Message::Binary(data)) => {
                // Treat raw binary frames as terminal input for convenience.
                let text = String::from_utf8_lossy(&data).into_owned();
                if client_tx
                    .send(TerminalClientMsg::Input { data: text })
                    .await
                    .is_err()
                {
                    break;
                }
            }
            Ok(Message::Close(_)) | Err(_) => break,
            _ => {} // Ping/Pong handled by axum
        }
    }

    // Client disconnected — drop the sender so the bridge loop exits.
    drop(client_tx);

    // Wait for both tasks to finish.
    let _ = bridge_handle.await;
    let _ = writer_handle.await;

    Ok(())
}
