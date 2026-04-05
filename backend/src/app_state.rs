//! Shared application state passed into API handlers.

use std::sync::Arc;

use crate::{
    auth::{jwt::JwtService, oidc::OidcService, session::SessionService},
    config::AppConfig,
    db::{
        api_token_repo::ApiTokenRepo,
        oauth_repo::{OAuthAppRepo, OAuthCodeRepo, OAuthTokenRepo},
        user_repo::UserRepo,
    },
    services::{
        command_service::CommandService, container_service::ContainerService,
        network_service::NetworkService, program_service::ProgramService,
        terminal_service::TerminalService, webhook_service::WebhookService,
    },
    webhooks::registry::ProviderRegistry,
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
    pub program_service: Arc<ProgramService>,
    pub network_service: Arc<NetworkService>,
    pub user_repo: Arc<dyn UserRepo>,
    pub api_token_repo: Arc<dyn ApiTokenRepo>,
    pub oauth_app_repo: Arc<dyn OAuthAppRepo>,
    pub oauth_code_repo: Arc<dyn OAuthCodeRepo>,
    pub oauth_token_repo: Arc<dyn OAuthTokenRepo>,
    pub oidc_service: Option<Arc<OidcService>>,
    pub webhook_service: Arc<WebhookService>,
    pub provider_registry: Arc<ProviderRegistry>,
}

impl AppState {
    /// Creates a new application state container.
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        config: Arc<AppConfig>,
        session_service: Arc<SessionService>,
        jwt_service: Arc<JwtService>,
        container_service: Arc<ContainerService>,
        command_service: Arc<CommandService>,
        terminal_service: Arc<TerminalService>,
        program_service: Arc<ProgramService>,
        network_service: Arc<NetworkService>,
        user_repo: Arc<dyn UserRepo>,
        api_token_repo: Arc<dyn ApiTokenRepo>,
        oauth_app_repo: Arc<dyn OAuthAppRepo>,
        oauth_code_repo: Arc<dyn OAuthCodeRepo>,
        oauth_token_repo: Arc<dyn OAuthTokenRepo>,
        oidc_service: Option<Arc<OidcService>>,
        webhook_service: Arc<WebhookService>,
        provider_registry: Arc<ProviderRegistry>,
    ) -> Self {
        Self {
            config,
            session_service,
            jwt_service,
            container_service,
            command_service,
            terminal_service,
            program_service,
            network_service,
            user_repo,
            api_token_repo,
            oauth_app_repo,
            oauth_code_repo,
            oauth_token_repo,
            oidc_service,
            webhook_service,
            provider_registry,
        }
    }
}
