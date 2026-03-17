//! Binary entry point for the backend API server.

use std::{net::SocketAddr, sync::Arc};

use hzel_backend::{
    api,
    app_state::AppState,
    auth::{session::{SessionConfig, SessionService}, store::InMemoryAuthStore},
    config::AppConfig,
    db::{self, audit_repo::PgAuditRepo, command_repo::PgCommandRepo, container_repo::PgContainerRepo, pg_auth_store::PgAuthStore},
    proxmox::{client::StubProxmoxClient, http_client::HttpProxmoxClient},
    services::{audit_service::AuditService, command_service::CommandService, container_service::ContainerService},
    ssh_ca::SshCa,
    utils::logging::init_tracing,
};
use tokio::net::TcpListener;
use tracing::info;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    init_tracing();

    let config = Arc::new(AppConfig::from_env());

    // Connect to PostgreSQL and run migrations.
    let pool = db::create_pool(&config.database_url).await?;
    db::run_migrations(&pool).await?;
    info!("database connected and migrations applied");

    // Auth store — use PG-backed store, but keep InMemoryAuthStore for dev bootstrap.
    let pg_auth_store: Arc<dyn hzel_backend::auth::store::AuthStore> = Arc::new(PgAuthStore::new(pool.clone()));
    let in_memory_store = Arc::new(InMemoryAuthStore::new());

    // For dev bootstrap we need the in-memory store to seed a session,
    // so the session service uses the in-memory store when bootstrapping,
    // otherwise it uses the PG store.
    let session_service = if config.bootstrap_dev_session {
        Arc::new(SessionService::new(SessionConfig::default(), in_memory_store.clone()))
    } else {
        Arc::new(SessionService::new(SessionConfig::default(), pg_auth_store.clone()))
    };

    if config.bootstrap_dev_session {
        let seeded = in_memory_store.seed_demo_admin_session().await;
        info!(
            email = %seeded.user.email,
            cookie_name = %session_service.config().cookie_name,
            cookie_value = %seeded.session.id,
            csrf_token = %seeded.session.csrf_token,
            "bootstrapped development session"
        );
    }

    // Repositories
    let audit_repo: Arc<dyn hzel_backend::db::audit_repo::AuditRepo> = Arc::new(PgAuditRepo::new(pool.clone()));
    let container_repo: Arc<dyn hzel_backend::db::container_repo::ContainerRepo> = Arc::new(PgContainerRepo::new(pool.clone()));
    let command_repo: Arc<dyn hzel_backend::db::command_repo::CommandRepo> = Arc::new(PgCommandRepo::new(pool.clone()));

    // SSH CA — load if configured, otherwise skip (terminal sessions won't be available).
    if std::path::Path::new(&config.ssh_ca_private_key_path).exists() {
        let ca = SshCa::load(&config.ssh_ca_private_key_path)
            .map_err(|e| format!("SSH CA init failed: {}", e.message))?;
        info!(public_key = %ca.public_key_openssh(), "SSH CA loaded");
    }

    // Proxmox client — use real client if API token is configured, otherwise stub.
    let proxmox: Arc<dyn hzel_backend::proxmox::client::ProxmoxClient> =
        if config.proxmox_api_token_secret.is_empty() {
            info!("PROXMOX_API_TOKEN_SECRET not set — using stub Proxmox client");
            Arc::new(StubProxmoxClient::new())
        } else {
            let client = HttpProxmoxClient::new(&config)
                .map_err(|e| format!("Proxmox client init failed: {}", e.message))?;
            info!(url = %config.proxmox_api_url, node = %config.proxmox_node, "Proxmox client initialized");
            Arc::new(client)
        };

    let audit = Arc::new(AuditService::new(audit_repo));
    let container_service = Arc::new(ContainerService::new(proxmox.clone(), container_repo, audit.clone()));
    let command_service = Arc::new(CommandService::new(command_repo, audit));
    let state = AppState::new(config.clone(), session_service, container_service, command_service);

    let app = api::router::build_router(state);
    let address = SocketAddr::from(([0, 0, 0, 0], config.port));
    let listener = TcpListener::bind(address).await?;

    info!(port = config.port, "backend server initialized");
    axum::serve(listener, app).await?;
    Ok(())
}
