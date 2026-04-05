//! Terminal session service — bridges WebSocket connections to SSH PTY sessions
//! on containers using ephemeral CA-signed certificates.

use std::sync::Arc;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use russh::keys::{decode_secret_key, Certificate};
use russh::{client, Channel, ChannelMsg, Disconnect};
use tokio::sync::mpsc;
use tracing::{info, warn};
use uuid::Uuid;

/// Output captured from a non-interactive SSH exec channel.
pub struct ExecOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: u32,
}

const IP_POLL_INTERVAL: std::time::Duration = std::time::Duration::from_secs(2);
const IP_POLL_ATTEMPTS: u32 = 15; // up to 30 s

use crate::{
    config::AppConfig,
    jobs::terminal::{TerminalClientMsg, TerminalStreamEvent},
    proxmox::client::ProxmoxClient,
    ssh_ca::SshCa,
    utils::error::ApiError,
};

/// Minimal russh client handler — accepts any server host key.
struct SshHandler;

impl client::Handler for SshHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &russh::keys::PublicKey,
    ) -> Result<bool, Self::Error> {
        // In production you would verify against known host keys.
        Ok(true)
    }
}

/// Service that manages interactive SSH terminal sessions.
pub struct TerminalService {
    proxmox: Arc<dyn ProxmoxClient>,
    ssh_ca: Option<Arc<SshCa>>,
    config: Arc<AppConfig>,
}

impl TerminalService {
    /// Creates a new terminal service.
    pub fn new(
        proxmox: Arc<dyn ProxmoxClient>,
        ssh_ca: Option<Arc<SshCa>>,
        config: Arc<AppConfig>,
    ) -> Self {
        Self {
            proxmox,
            ssh_ca,
            config,
        }
    }

    /// Establishes an authenticated SSH session to a container.
    ///
    /// Resolves the container IP via Proxmox (with polling), issues an ephemeral
    /// certificate, and returns the connected russh session handle.
    ///
    /// * `ctid`     — Proxmox container ID
    /// * `key_id`   — audit key-id string embedded in the certificate (e.g. `"network:uuid:attach"`)
    /// * `validity` — certificate validity in seconds
    async fn connect(
        &self,
        ctid: i32,
        key_id: &str,
        validity: u64,
    ) -> Result<client::Handle<SshHandler>, ApiError> {
        // 1. Resolve container IP with the same polling loop used by open_session.
        let ip = {
            let mut last_err =
                ApiError::internal(format!("No IPv4 address found for container {ctid}"));
            let mut found = None;
            for attempt in 1..=IP_POLL_ATTEMPTS {
                match self.proxmox.get_container_ip(ctid).await {
                    Ok(addr) => {
                        found = Some(addr);
                        break;
                    }
                    Err(e) => {
                        warn!(ctid, attempt, "waiting for container IP: {}", e.message);
                        last_err = e;
                        tokio::time::sleep(IP_POLL_INTERVAL).await;
                    }
                }
            }
            found.ok_or(last_err)?
        };
        let addr = format!("{}:{}", ip, self.config.ssh_port);

        // 2. Issue an ephemeral certificate.
        let ssh_ca = self.ssh_ca.as_ref().ok_or_else(|| {
            ApiError::internal("SSH CA not configured — SSH sessions are unavailable")
        })?;
        let ephemeral = ssh_ca.issue(&self.config.ssh_user, key_id, validity)?;

        // 3. Connect via russh.
        let ssh_config = Arc::new(client::Config {
            inactivity_timeout: Some(std::time::Duration::from_secs(300)),
            ..<_>::default()
        });
        let mut session = client::connect(ssh_config, &*addr, SshHandler)
            .await
            .map_err(|e| ApiError::internal(format!("SSH connect failed: {e}")))?;

        // 4. Authenticate with the ephemeral certificate (bridge via OpenSSH format).
        let cert_openssh = ephemeral
            .certificate
            .to_openssh()
            .map_err(|e| ApiError::internal(format!("Failed to serialise certificate: {e}")))?;
        let cert = Certificate::from_openssh(&cert_openssh)
            .map_err(|e| ApiError::internal(format!("Failed to parse certificate: {e}")))?;

        let privkey_openssh = ephemeral
            .private_key
            .to_openssh(ssh_key::LineEnding::LF)
            .map_err(|e| ApiError::internal(format!("Failed to serialise private key: {e}")))?;
        let russh_privkey = decode_secret_key(privkey_openssh.as_ref(), None).map_err(|e| {
            ApiError::internal(format!("Failed to parse private key for russh: {e}"))
        })?;

        let auth = session
            .authenticate_openssh_cert(&*self.config.ssh_user, Arc::new(russh_privkey), cert)
            .await
            .map_err(|e| ApiError::internal(format!("SSH auth failed: {e}")))?;

        if !auth.success() {
            return Err(ApiError::internal("SSH certificate authentication rejected"));
        }

        Ok(session)
    }

    /// Executes a single non-interactive command inside a container via SSH and
    /// returns captured stdout, stderr, and the exit code.
    ///
    /// The `command` string is transmitted verbatim to the remote sshd exec
    /// channel — it is **never** interpreted by a local shell on the control-plane
    /// host. Any shell interpretation happens entirely within the container.
    ///
    /// * `ctid`    — Proxmox container ID
    /// * `key_id`  — audit key-id embedded in the ephemeral certificate
    /// * `command` — shell command to run inside the container
    pub async fn exec_command(
        &self,
        ctid: i32,
        key_id: &str,
        command: &str,
    ) -> Result<ExecOutput, ApiError> {
        let session = self.connect(ctid, key_id, 60).await?;

        let channel = session
            .channel_open_session()
            .await
            .map_err(|e| ApiError::internal(format!("SSH channel open failed: {e}")))?;

        channel
            .exec(true, command)
            .await
            .map_err(|e| ApiError::internal(format!("SSH exec failed: {e}")))?;

        let mut stdout = Vec::new();
        let mut stderr = Vec::new();
        let mut exit_code: u32 = 0;

        // Drain the channel until EOF / exit status.
        let mut ch = channel;
        loop {
            match ch.wait().await {
                Some(ChannelMsg::Data { ref data }) => {
                    stdout.extend_from_slice(data);
                }
                Some(ChannelMsg::ExtendedData { ref data, ext }) if ext == 1 => {
                    stderr.extend_from_slice(data);
                }
                Some(ChannelMsg::ExitStatus { exit_status }) => {
                    exit_code = exit_status;
                }
                Some(ChannelMsg::Eof) | None => break,
                _ => {}
            }
        }

        let _ = session.disconnect(Disconnect::ByApplication, "", "").await;

        Ok(ExecOutput {
            stdout: String::from_utf8_lossy(&stdout).into_owned(),
            stderr: String::from_utf8_lossy(&stderr).into_owned(),
            exit_code,
        })
    }

    /// Opens an interactive SSH session to the given container and bridges it
    /// to the provided channel pair.
    ///
    /// * `user_id` — the authenticated user (used for cert key-id audit trail)
    /// * `ctid` — Proxmox container ID
    /// * `cols` / `rows` — initial terminal dimensions
    /// * `client_rx` — receives [`TerminalClientMsg`] from the WebSocket reader
    /// * `server_tx` — sends [`TerminalStreamEvent`] to the WebSocket writer
    pub async fn open_session(
        &self,
        user_id: Uuid,
        ctid: i32,
        cols: u16,
        rows: u16,
        client_rx: mpsc::Receiver<TerminalClientMsg>,
        server_tx: mpsc::Sender<TerminalStreamEvent>,
    ) -> Result<(), ApiError> {
        // 1–4. Reuse the shared connect helper (300 s cert for interactive sessions).
        let key_id = format!("user:{}:terminal", user_id);
        let session = self.connect(ctid, &key_id, 300).await?;

        // 5. Open a session channel and request a PTY + shell.
        let channel = session
            .channel_open_session()
            .await
            .map_err(|e| ApiError::internal(format!("SSH channel open failed: {e}")))?;

        channel
            .request_pty(false, "xterm-256color", cols as u32, rows as u32, 0, 0, &[])
            .await
            .map_err(|e| ApiError::internal(format!("PTY request failed: {e}")))?;

        channel
            .request_shell(false)
            .await
            .map_err(|e| ApiError::internal(format!("Shell request failed: {e}")))?;

        info!(ctid, %user_id, "terminal session opened");

        // 6. Bridge loop — shuttle data between WS and SSH.
        // Pass a reference to `session` so the bridge can open additional
        // SSH exec channels for file uploads.
        Self::bridge(&session, channel, client_rx, server_tx).await;

        let _ = session.disconnect(Disconnect::ByApplication, "", "").await;

        Ok(())
    }

    /// Internal bridge loop: reads from both the SSH channel and the WS
    /// client channel, forwarding data in both directions until one side
    /// closes.
    ///
    /// `session` is borrowed so the bridge can open additional SSH exec
    /// channels for file uploads without establishing a new SSH connection.
    async fn bridge(
        session: &client::Handle<SshHandler>,
        mut channel: Channel<client::Msg>,
        mut client_rx: mpsc::Receiver<TerminalClientMsg>,
        server_tx: mpsc::Sender<TerminalStreamEvent>,
    ) {
        loop {
            tokio::select! {
                // Data from the SSH server → send to WS client
                msg = channel.wait() => {
                    match msg {
                        Some(ChannelMsg::Data { ref data }) => {
                            let text = String::from_utf8_lossy(data).into_owned();
                            if server_tx.send(TerminalStreamEvent::Output { data: text }).await.is_err() {
                                break;
                            }
                        }
                        Some(ChannelMsg::ExitStatus { .. })
                        | Some(ChannelMsg::Eof)
                        | None => {
                            let _ = server_tx.send(TerminalStreamEvent::Closed).await;
                            break;
                        }
                        _ => {}
                    }
                }
                // Data from the WS client → send to SSH server
                msg = client_rx.recv() => {
                    match msg {
                        Some(TerminalClientMsg::Input { data }) => {
                            if let Err(e) = channel.data(data.as_bytes()).await {
                                warn!("SSH data send error: {e}");
                                let _ = server_tx.send(TerminalStreamEvent::Error {
                                    message: format!("SSH write error: {e}"),
                                }).await;
                                break;
                            }
                        }
                        Some(TerminalClientMsg::Resize { cols, rows }) => {
                            if let Err(e) = channel.window_change(cols as u32, rows as u32, 0, 0).await {
                                warn!("SSH resize error: {e}");
                            }
                        }
                        Some(TerminalClientMsg::FileUpload { path, data }) => {
                            let event = match Self::upload_file(session, &path, &data).await {
                                Ok(()) => TerminalStreamEvent::FileUploaded { path },
                                Err(msg) => TerminalStreamEvent::FileUploadError { path, message: msg },
                            };
                            let _ = server_tx.send(event).await;
                        }
                        None => {
                            // WS closed — send EOF to SSH and break.
                            let _ = channel.eof().await;
                            break;
                        }
                    }
                }
            }
        }
    }

    /// Opens a fresh SSH exec channel on the existing session and writes
    /// `data_b64` (standard Base64) to `path` inside the container.
    ///
    /// The destination directory must already exist. Paths must not contain
    /// null bytes or single quotes.
    async fn upload_file(
        session: &client::Handle<SshHandler>,
        path: &str,
        data_b64: &str,
    ) -> Result<(), String> {
        // ── Validate path ────────────────────────────────────────────────
        if path.is_empty() {
            return Err("path must not be empty".to_string());
        }
        if path.len() > 4096 {
            return Err("path is too long".to_string());
        }
        if path.contains('\0') || path.contains('\'') {
            return Err("path contains disallowed characters (null byte or single quote)".to_string());
        }

        // ── Decode Base64 payload ────────────────────────────────────────
        let bytes = BASE64
            .decode(data_b64)
            .map_err(|e| format!("invalid Base64 data: {e}"))?;

        const MAX_BYTES: usize = 10 * 1024 * 1024; // 10 MiB
        if bytes.len() > MAX_BYTES {
            return Err(format!(
                "file too large ({} bytes); maximum is {} bytes",
                bytes.len(),
                MAX_BYTES,
            ));
        }

        // ── Open a new exec channel on the existing SSH session ──────────
        let mut upload_ch = session
            .channel_open_session()
            .await
            .map_err(|e| format!("failed to open upload channel: {e}"))?;

        // `cat > 'path'` — safe because path was validated above.
        let cmd = format!("cat > '{path}'");
        upload_ch
            .exec(true, cmd)
            .await
            .map_err(|e| format!("exec failed: {e}"))?;

        // Write file bytes then signal EOF so cat knows the input is done.
        upload_ch
            .data(bytes.as_slice())
            .await
            .map_err(|e| format!("data write failed: {e}"))?;

        upload_ch
            .eof()
            .await
            .map_err(|e| format!("eof failed: {e}"))?;

        // Wait for the remote process to exit.
        let mut exit_code: Option<u32> = None;
        while let Some(msg) = upload_ch.wait().await {
            if let ChannelMsg::ExitStatus { exit_status } = msg {
                exit_code = Some(exit_status);
            }
        }

        match exit_code {
            Some(0) | None => Ok(()),
            Some(code) => Err(format!("cat exited with status {code}")),
        }
    }
}
