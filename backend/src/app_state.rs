//! Shared application state passed into API handlers.

use std::sync::Arc;

use crate::{
    auth::{jwt::JwtService, oidc::OidcService, session::SessionService},
    config::AppConfig,
    db::user_repo::UserRepo,
    services::{
        command_service::CommandService, container_service::ContainerService,
        terminal_service::TerminalService,
    },
};

/// Runtime state shared by API routes.
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub session_service: Arc<SessionService>,
    pub jwt_service: Arc<JwtService>,
    pub container_service: Arc<ContainerService>,
    pub command_service: Arc<CommandService>,
    pub terminal_service: Arc<TerminalService>,
    pub user_repo: Arc<dyn UserRepo>,
    pub oidc_service: Option<Arc<OidcService>>,
}

impl AppState {
    /// Creates a new application state container.
    pub fn new(
        config: Arc<AppConfig>,
        session_service: Arc<SessionService>,
        jwt_service: Arc<JwtService>,
        container_service: Arc<ContainerService>,
        command_service: Arc<CommandService>,
        terminal_service: Arc<TerminalService>,
        user_repo: Arc<dyn UserRepo>,
        oidc_service: Option<Arc<OidcService>>,
    ) -> Self {
        Self {
            config,
            session_service,
            jwt_service,
            container_service,
            command_service,
            terminal_service,
            user_repo,
            oidc_service,
        }
    }
}
