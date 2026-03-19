//! Binary entry point for the backend API server.

use std::{net::SocketAddr, sync::Arc};

use std::time::Duration;

use hzel_backend::{
    api,
    app_state::AppState,
    auth::{jwt::JwtService, oidc::OidcService, session::{SessionConfig, SessionService}, store::InMemoryAuthStore},
    config::AppConfig,
    db::{self, audit_repo::PgAuditRepo, command_repo::PgCommandRepo, container_repo::PgContainerRepo, pg_auth_store::PgAuthStore, user_repo::PgUserRepo},
    jobs::state_sync,
    proxmox::{client::StubProxmoxClient, http_client::HttpProxmoxClient},
    services::{audit_service::AuditService, command_service::CommandService, container_service::ContainerService, terminal_service::TerminalService},
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

        // Ensure the dev user exists in PostgreSQL so FK constraints
        // (e.g. container_ownerships.user_id) are satisfied.
        // If the email already exists, read back its id and patch the in-memory store.
        let row: Option<(uuid::Uuid,)> = sqlx::query_as(
            "SELECT id FROM users WHERE email = $1",
        )
        .bind(&seeded.user.email)
        .fetch_optional(&pool)
        .await
        .expect("failed to query dev user");

        if let Some((existing_id,)) = row {
            // Re-key the in-memory session to use the existing PG user id.
            in_memory_store.patch_user_id(seeded.user.id, existing_id).await;
            // Also patch the seeded struct so the log below is accurate.
            // (session lookup still works because we patched the store)
        } else {
            sqlx::query(
                "INSERT INTO users (id, email, role, status, created_at) VALUES ($1, $2, $3, 'active', $4)",
            )
            .bind(seeded.user.id)
            .bind(&seeded.user.email)
            .bind("admin")
            .bind(seeded.user.created_at)
            .execute(&pool)
            .await
            .expect("failed to seed dev user into PostgreSQL");
        }

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
    let user_repo: Arc<dyn hzel_backend::db::user_repo::UserRepo> = Arc::new(PgUserRepo::new(pool.clone()));

    // SSH CA — load if configured, otherwise skip (terminal sessions won't be available).
    let ssh_ca: Option<Arc<SshCa>> = if std::path::Path::new(&config.ssh_ca_private_key_path).exists() {
        let ca = SshCa::load(&config.ssh_ca_private_key_path)
            .map_err(|e| format!("SSH CA init failed: {}", e.message))?;
        info!(public_key = %ca.public_key_openssh(), "SSH CA loaded");
        Some(Arc::new(ca))
    } else {
        info!("SSH CA key not found — terminal sessions will be unavailable");
        None
    };

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
    let container_service = Arc::new(ContainerService::new(proxmox.clone(), container_repo.clone(), audit.clone()));
    let command_service = Arc::new(CommandService::new(command_repo, audit));

    // Terminal service — requires SSH CA; if unavailable, sessions will error at runtime.
    let terminal_service = Arc::new(TerminalService::new(proxmox.clone(), ssh_ca, config.clone()));

    // OIDC service — initialise if enabled.
    let oidc_service = if config.oidc_enabled {
        let user_repo: Arc<dyn hzel_backend::db::user_repo::UserRepo> = Arc::new(PgUserRepo::new(pool.clone()));
        let oidc = OidcService::discover(&config, user_repo, pg_auth_store.clone())
            .await
            .map_err(|e| format!("OIDC init failed: {}", e.message))?;
        info!("OIDC authentication enabled");
        Some(Arc::new(oidc))
    } else {
        info!("OIDC authentication disabled");
        None
    };

    // JWT service for token-based authentication
    let jwt_service = Arc::new(JwtService::new(config.jwt_secret.clone()));

    let state = AppState::new(config.clone(), session_service, jwt_service, container_service, command_service, terminal_service, user_repo, oidc_service);

    // Background state sync — reconcile DB with Proxmox every 30 seconds.
    let _sync_handle = state_sync::spawn_state_sync(
        container_repo,
        proxmox,
        Duration::from_secs(30),
    );

    let app = api::router::build_router(state);
    let address = SocketAddr::from(([0, 0, 0, 0], config.port));
    let listener = TcpListener::bind(address).await?;

    info!(port = config.port, "backend server initialized");
    axum::serve(listener, app).await?;
    Ok(())
}
