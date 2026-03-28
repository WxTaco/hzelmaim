//! OpenAPI 3.0 specification generation via utoipa.

use axum::{Json, response::IntoResponse};
use utoipa::{openapi::security::{Http, HttpAuthScheme, SecurityScheme}, Modify, OpenApi};

use crate::api::handlers::{audit, auth, commands, containers, programs};

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
        // Containers
        containers::list,
        containers::create,
        containers::get,
        containers::start,
        containers::stop,
        containers::restart,
        containers::metrics,
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
    ),
    components(schemas(
        // Container models
        crate::models::container::ContainerRecord,
        crate::models::container::ContainerState,
        crate::models::container::AccessLevel,
        crate::proxmox::types::ContainerMetrics,
        // Program models
        crate::models::program::ProgramRecord,
        crate::models::program::ProgramMember,
        crate::models::program::ProgramDetail,
        crate::models::program::ProgramInvitation,
        crate::models::program::PendingInvitationView,
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
        // Handler DTOs
        crate::api::handlers::containers::ApiCreateContainerRequest,
        crate::api::handlers::programs::CreateProgramBody,
        crate::api::handlers::programs::UpdatePermissionsBody,
        crate::api::handlers::programs::UserPermissions,
        crate::api::handlers::programs::InviteByEmailBody,
        crate::api::handlers::programs::RespondBody,
        crate::api::handlers::commands::EnqueueCommandBody,
        crate::api::handlers::auth::RefreshTokenRequest,
        crate::api::handlers::auth::TokenResponse,
        crate::api::handlers::auth::UserInfoResponse,
        crate::api::handlers::auth::SessionView,
        crate::api::handlers::auth::SessionDetails,
        crate::api::handlers::auth::CreateTokenRequest,
        crate::api::handlers::auth::CreateTokenResponse,
    )),
    modifiers(&BearerAuth),
    tags(
        (name = "health", description = "Health checks"),
        (name = "auth",   description = "Authentication and session management"),
        (name = "tokens", description = "Personal access tokens"),
        (name = "containers", description = "Container lifecycle and metrics"),
        (name = "programs",   description = "Programs and invitations"),
        (name = "commands",   description = "Container command execution"),
        (name = "audit",      description = "Audit log"),
    ),
)]
pub struct ApiDoc;

/// Serves the OpenAPI JSON specification.
pub async fn openapi_json() -> impl IntoResponse {
    Json(ApiDoc::openapi())
}
