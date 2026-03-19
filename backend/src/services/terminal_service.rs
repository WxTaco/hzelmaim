//! Terminal session service — bridges WebSocket connections to SSH PTY sessions
//! on containers using ephemeral CA-signed certificates.

use std::sync::Arc;

use russh::keys::{decode_secret_key, Certificate};
use russh::{client, Channel, ChannelMsg, Disconnect};
use tokio::sync::mpsc;
use tracing::{info, warn};
use uuid::Uuid;

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
        // 1. Resolve the container IP via Proxmox.
        //    The container may have just started and DHCP may not have
        //    assigned an address yet — poll until one appears.
        let ip = {
            let mut last_err = ApiError::internal(format!("No IPv4 address found for container {ctid}"));
            let mut found = None;
            for attempt in 1..=IP_POLL_ATTEMPTS {
                match self.proxmox.get_container_ip(ctid).await {
                    Ok(addr) => { found = Some(addr); break; }
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

        // 2. Issue an ephemeral certificate (300 s validity).
        let ssh_ca = self.ssh_ca.as_ref().ok_or_else(|| {
            ApiError::internal("SSH CA not configured — terminal sessions are unavailable")
        })?;
        let key_id = format!("user:{}:terminal", user_id);
        let ephemeral = ssh_ca.issue(&self.config.ssh_user, &key_id, 300)?;

        // 3. Connect via russh.
        let ssh_config = Arc::new(client::Config {
            inactivity_timeout: Some(std::time::Duration::from_secs(600)),
            ..<_>::default()
        });

        let mut session = client::connect(ssh_config, &*addr, SshHandler)
            .await
            .map_err(|e| ApiError::internal(format!("SSH connect failed: {e}")))?;

        // 4. Authenticate with the ephemeral certificate.
        //    The SshCa uses the `ssh_key` crate while russh uses its own forked
        //    `internal-russh-forked-ssh-key`. We bridge the two by serialising
        //    to OpenSSH format and re-parsing through russh's types.
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
            return Err(ApiError::internal(
                "SSH certificate authentication rejected",
            ));
        }

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
        Self::bridge(channel, client_rx, server_tx).await;

        let _ = session.disconnect(Disconnect::ByApplication, "", "").await;

        Ok(())
    }

    /// Internal bridge loop: reads from both the SSH channel and the WS
    /// client channel, forwarding data in both directions until one side
    /// closes.
    async fn bridge(
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
}
