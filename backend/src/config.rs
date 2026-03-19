//! Application configuration types loaded from the environment.

use std::env;

/// Runtime configuration for the backend service.
#[derive(Debug, Clone)]
pub struct AppConfig {
    pub port: u16,
    pub database_url: String,
    pub public_base_url: String,

    // Proxmox
    pub proxmox_api_url: String,
    pub proxmox_api_token_id: String,
    pub proxmox_api_token_secret: String,
    pub proxmox_node: String,
    /// Proxmox CT ID of the template container to clone from.
    pub proxmox_template_ctid: i32,
    pub proxmox_storage: String,
    pub proxmox_bridge: String,

    // Cloudflare Access (optional, for tunneled Proxmox)
    pub cf_access_client_id: String,
    pub cf_access_client_secret: String,

    // SSH CA
    pub ssh_ca_private_key_path: String,

    // SSH terminal session defaults
    pub ssh_user: String,
    pub ssh_port: u16,

    // OIDC
    pub oidc_enabled: bool,
    pub oidc_issuer_url: String,
    pub oidc_client_id: String,
    pub oidc_client_secret: String,
    pub oidc_redirect_uri: String,

    // JWT
    pub jwt_secret: String,

    pub bootstrap_dev_session: bool,
}

impl AppConfig {
    /// Builds configuration using environment variables with safe defaults for local scaffolding.
    pub fn from_env() -> Self {
        Self {
            port: env::var("PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(8080),
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://hzel:hzel@localhost:5432/hzel".into()),
            public_base_url: env::var("PUBLIC_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:8080".into()),

            proxmox_api_url: env::var("PROXMOX_API_URL")
                .unwrap_or_else(|_| "https://proxmox.example.internal:8006/api2/json".into()),
            proxmox_api_token_id: env::var("PROXMOX_API_TOKEN_ID")
                .unwrap_or_else(|_| "root@pam!hzel".into()),
            proxmox_api_token_secret: env::var("PROXMOX_API_TOKEN_SECRET").unwrap_or_default(),
            proxmox_node: env::var("PROXMOX_NODE").unwrap_or_else(|_| "pve".into()),
            proxmox_template_ctid: env::var("PROXMOX_TEMPLATE_CTID")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(1000),
            proxmox_storage: env::var("PROXMOX_STORAGE").unwrap_or_else(|_| "local-lvm".into()),
            proxmox_bridge: env::var("PROXMOX_BRIDGE").unwrap_or_else(|_| "vmbr0".into()),

            cf_access_client_id: env::var("CF_ACCESS_CLIENT_ID").unwrap_or_default(),
            cf_access_client_secret: env::var("CF_ACCESS_CLIENT_SECRET").unwrap_or_default(),

            ssh_ca_private_key_path: env::var("SSH_CA_PRIVATE_KEY_PATH")
                .unwrap_or_else(|_| "keys/ca".into()),

            ssh_user: env::var("SSH_USER").unwrap_or_else(|_| "root".into()),
            ssh_port: env::var("SSH_PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(22),

            oidc_enabled: env::var("OIDC_ENABLED")
                .map(|v| v == "true")
                .unwrap_or(false),
            oidc_issuer_url: env::var("OIDC_ISSUER_URL").unwrap_or_default(),
            oidc_client_id: env::var("OIDC_CLIENT_ID").unwrap_or_default(),
            oidc_client_secret: env::var("OIDC_CLIENT_SECRET").unwrap_or_default(),
            oidc_redirect_uri: env::var("OIDC_REDIRECT_URI").unwrap_or_else(|_| {
                let base =
                    env::var("PUBLIC_BASE_URL").unwrap_or_else(|_| "http://localhost:8080".into());
                format!("{}/api/v1/auth/oidc/callback", base)
            }),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "dev-secret-change-in-production".into()),
            bootstrap_dev_session: env::var("BOOTSTRAP_DEV_SESSION")
                .map(|v| v == "true")
                .unwrap_or(false),
        }
    }
}
