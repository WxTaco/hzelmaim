//! OpenAPI 3.0 specification generation via utoipa.

use axum::{Json, response::IntoResponse};
use utoipa::{openapi::security::{Http, HttpAuthScheme, SecurityScheme}, Modify, OpenApi};

use crate::api::handlers::{audit, auth, commands, containers, networks, oauth, programs, webhooks};

/// Security scheme modifier — injects a Bearer JWT scheme into the spec.
struct BearerAuth;

impl Modify for BearerAuth {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_auth",
                SecurityScheme::Http(Http::new(HttpAuthScheme::Bearer)),
            );
        }
    }
}

/// Root OpenAPI document aggregating all paths and schemas.
#[derive(OpenApi)]
#[openapi(
    info(
        title = "hzel API",
        version = "1.0.0",
        description = "Container management platform API",
    ),
    paths(
        // Health
        auth::health,
        // Auth
        auth::login,
        auth::logout,
        auth::session,
        auth::me,
        auth::refresh_token,
        auth::oidc_authorize,
        auth::oidc_callback,
        // Personal access tokens
        auth::create_token,
        auth::list_tokens,
        auth::revoke_token,
        // Containers — lifecycle and metrics
        containers::list,
        containers::create,
        containers::get,
        containers::start,
        containers::stop,
        containers::restart,
        containers::metrics,
        // Containers — sharing invitations
        containers::share,
        containers::pending_sharing_invitations,
        containers::respond_to_sharing_invitation,
        // Programs
        programs::list_programs,
        programs::create_program,
        programs::get_program,
        programs::update_permissions,
        programs::my_permissions,
        programs::pending_invitations,
        programs::invite_by_email,
        programs::respond,
        // Commands
        commands::enqueue,
        commands::get,
        // Audit
        audit::list,
        // Networks
        networks::list_networks,
        networks::create_network,
        networks::get_network,
        networks::rename_network,
        networks::delete_network,
        networks::list_members,
        networks::add_member,
        networks::remove_member,
        networks::list_for_container,
        // Webhooks — CRUD
        webhooks::create_config,
        webhooks::list_configs,
        webhooks::get_config,
        webhooks::update_config,
        webhooks::delete_config,
        webhooks::list_deliveries,
        // Webhooks — inbound receiver
        webhooks::receive_webhook,
        // OAuth — app management
        oauth::create_app,
        oauth::list_apps,
        oauth::get_app,
        oauth::update_app,
        oauth::delete_app,
        oauth::rotate_secret,
        oauth::public_app_info,
        // OAuth — authorization code flow
        oauth::authorize_get,
        oauth::authorize_post,
        oauth::token,
        oauth::revoke,
    ),
    components(schemas(
        // Container models
        crate::models::container::ContainerRecord,
        crate::models::container::ContainerWithPermissions,
        crate::models::container::Permissions,
        crate::models::container::ContainerState,
        crate::models::container::AccessLevel,
        crate::models::container::ContainerInvitation,
        crate::models::container::PendingContainerInvitationView,
        crate::proxmox::types::ContainerMetrics,
        // Program models
        crate::models::program::ProgramRecord,
        crate::models::program::ProgramMember,
        crate::models::program::ProgramDetail,
        crate::models::program::ProgramInvitation,
        crate::models::program::PendingInvitationView,
        // Network models
        crate::models::network::PrivateNetwork,
        crate::models::network::NetworkState,
        crate::models::network::NetworkMembership,
        crate::models::network::MembershipState,
        crate::models::network::CreateNetworkRequest,
        crate::models::network::RenameNetworkRequest,
        crate::models::network::AddMemberRequest,
        // Webhook models
        crate::models::webhook::WebhookConfig,
        crate::models::webhook::WebhookDelivery,
        crate::models::webhook::DeliveryStatus,
        crate::models::webhook::CreateWebhookConfigRequest,
        crate::models::webhook::UpdateWebhookConfigRequest,
        // OAuth models
        crate::models::oauth::OAuthApplicationView,
        crate::models::oauth::OAuthAppPublicView,
        // Auth / user models
        crate::models::user::UserRole,
        crate::models::session::AuthMethod,
        crate::auth::context::AuthenticatedUser,
        crate::auth::session::SessionConfig,
        // Token models
        crate::models::api_token::ApiTokenView,
        // Command models
        crate::models::command::CommandExecutionRecord,
        crate::models::command::CommandExecutionStatus,
        // Audit models
        crate::models::audit::AuditLogRecord,
        // Handler DTOs — containers
        crate::api::handlers::containers::ApiCreateContainerRequest,
        crate::api::handlers::containers::ShareContainerBody,
        crate::api::handlers::containers::SharingRespondBody,
        // Handler DTOs — programs
        crate::api::handlers::programs::CreateProgramBody,
        crate::api::handlers::programs::UpdatePermissionsBody,
        crate::api::handlers::programs::UserPermissions,
        crate::api::handlers::programs::InviteByEmailBody,
        crate::api::handlers::programs::RespondBody,
        // Handler DTOs — commands
        crate::api::handlers::commands::EnqueueCommandBody,
        // Handler DTOs — auth
        crate::api::handlers::auth::RefreshTokenRequest,
        crate::api::handlers::auth::TokenResponse,
        crate::api::handlers::auth::UserInfoResponse,
        crate::api::handlers::auth::SessionView,
        crate::api::handlers::auth::SessionDetails,
        crate::api::handlers::auth::CreateTokenRequest,
        crate::api::handlers::auth::CreateTokenResponse,
        // Handler DTOs — OAuth
        crate::api::handlers::oauth::CreateAppRequest,
        crate::api::handlers::oauth::CreateAppResponse,
        crate::api::handlers::oauth::UpdateAppRequest,
        crate::api::handlers::oauth::RotateSecretResponse,
        crate::api::handlers::oauth::AuthorizeBody,
        crate::api::handlers::oauth::AuthorizeParams,
        crate::api::handlers::oauth::AuthorizeResponse,
        crate::api::handlers::oauth::TokenRequest,
        crate::api::handlers::oauth::TokenResponse,
        crate::api::handlers::oauth::RevokeRequest,
    )),
    modifiers(&BearerAuth),
    tags(
        (name = "health",     description = "Health checks"),
        (name = "auth",       description = "Authentication and session management"),
        (name = "tokens",     description = "Personal access tokens"),
        (name = "containers", description = "Container lifecycle, metrics, and sharing"),
        (name = "programs",   description = "Programs and invitations"),
        (name = "commands",   description = "Container command execution"),
        (name = "audit",      description = "Audit log"),
        (name = "networks",   description = "Private networking"),
        (name = "webhooks",   description = "Webhook configurations and event delivery"),
        (name = "oauth",      description = "OAuth 2.0 application management and authorization"),
    ),
)]
pub struct ApiDoc;

/// Serves the OpenAPI JSON specification.
pub async fn openapi_json() -> impl IntoResponse {
    Json(ApiDoc::openapi())
}
