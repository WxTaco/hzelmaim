//! Shared application state passed into API handlers.

use std::sync::Arc;

use crate::{
    auth::{oidc::OidcService, session::SessionService},
    config::AppConfig,
    services::{command_service::CommandService, container_service::ContainerService, terminal_service::TerminalService},
};

/// Runtime state shared by API routes.
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub session_service: Arc<SessionService>,
    pub container_service: Arc<ContainerService>,
    pub command_service: Arc<CommandService>,
    pub terminal_service: Arc<TerminalService>,
    pub oidc_service: Option<Arc<OidcService>>,
}

impl AppState {
    /// Creates a new application state container.
    pub fn new(
        config: Arc<AppConfig>,
        session_service: Arc<SessionService>,
        container_service: Arc<ContainerService>,
        command_service: Arc<CommandService>,
        terminal_service: Arc<TerminalService>,
        oidc_service: Option<Arc<OidcService>>,
    ) -> Self {
        Self { config, session_service, container_service, command_service, terminal_service, oidc_service }
    }
}
