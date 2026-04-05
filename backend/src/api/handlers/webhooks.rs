//! HTTP handlers for webhook configuration CRUD and the inbound event receiver.

use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    api::response::ApiResponse,
    app_state::AppState,
    auth::{context::AuthenticatedUser, csrf::CsrfProtected},
    models::webhook::{
        CreateWebhookConfigRequest, UpdateWebhookConfigRequest, WebhookConfig, WebhookDelivery,
    },
    utils::error::ApiError,
};

// ---------------------------------------------------------------------------
// CRUD handlers
// ---------------------------------------------------------------------------

/// `POST /api/v1/containers/{container_id}/webhooks` — create a webhook configuration.
#[utoipa::path(
    post,
    path = "/api/v1/containers/{container_id}/webhooks",
    params(("container_id" = uuid::Uuid, Path, description = "Container UUID")),
    request_body = CreateWebhookConfigRequest,
    responses(
        (status = 200, description = "Webhook configuration created", body = inline(ApiResponse<WebhookConfig>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Container not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "webhooks",
)]
pub async fn create_config(
    _csrf: CsrfProtected,
    actor: AuthenticatedUser,
    State(state): State<AppState>,
    Path(container_id): Path<Uuid>,
    Json(body): Json<CreateWebhookConfigRequest>,
) -> Result<Json<ApiResponse<WebhookConfig>>, ApiError> {
    let cfg = state
        .webhook_service
        .create_config(&actor, container_id, body)
        .await?;
    Ok(Json(ApiResponse::new(cfg)))
}

/// `GET /api/v1/containers/{container_id}/webhooks` — list webhook configurations.
#[utoipa::path(
    get,
    path = "/api/v1/containers/{container_id}/webhooks",
    params(("container_id" = uuid::Uuid, Path, description = "Container UUID")),
    responses(
        (status = 200, description = "List of webhook configurations", body = inline(ApiResponse<Vec<WebhookConfig>>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Container not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "webhooks",
)]
pub async fn list_configs(
    actor: AuthenticatedUser,
    State(state): State<AppState>,
    Path(container_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<WebhookConfig>>>, ApiError> {
    let cfgs = state
        .webhook_service
        .list_configs(&actor, container_id)
        .await?;
    Ok(Json(ApiResponse::new(cfgs)))
}

/// `GET /api/v1/containers/{container_id}/webhooks/{webhook_id}` — get a webhook config.
#[utoipa::path(
    get,
    path = "/api/v1/containers/{container_id}/webhooks/{webhook_id}",
    params(
        ("container_id" = uuid::Uuid, Path, description = "Container UUID"),
        ("webhook_id" = uuid::Uuid, Path, description = "Webhook UUID"),
    ),
    responses(
        (status = 200, description = "Webhook configuration", body = inline(ApiResponse<WebhookConfig>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "webhooks",
)]
pub async fn get_config(
    actor: AuthenticatedUser,
    State(state): State<AppState>,
    Path((_container_id, webhook_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ApiResponse<WebhookConfig>>, ApiError> {
    let cfg = state.webhook_service.get_config(&actor, webhook_id).await?;
    Ok(Json(ApiResponse::new(cfg)))
}

/// `PATCH /api/v1/containers/{container_id}/webhooks/{webhook_id}` — update a webhook config.
#[utoipa::path(
    patch,
    path = "/api/v1/containers/{container_id}/webhooks/{webhook_id}",
    params(
        ("container_id" = uuid::Uuid, Path, description = "Container UUID"),
        ("webhook_id" = uuid::Uuid, Path, description = "Webhook UUID"),
    ),
    request_body = UpdateWebhookConfigRequest,
    responses(
        (status = 200, description = "Updated webhook configuration", body = inline(ApiResponse<WebhookConfig>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "webhooks",
)]
pub async fn update_config(
    _csrf: CsrfProtected,
    actor: AuthenticatedUser,
    State(state): State<AppState>,
    Path((_container_id, webhook_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateWebhookConfigRequest>,
) -> Result<Json<ApiResponse<WebhookConfig>>, ApiError> {
    let cfg = state
        .webhook_service
        .update_config(&actor, webhook_id, body)
        .await?;
    Ok(Json(ApiResponse::new(cfg)))
}

/// `DELETE /api/v1/containers/{container_id}/webhooks/{webhook_id}` — delete a webhook config.
#[utoipa::path(
    delete,
    path = "/api/v1/containers/{container_id}/webhooks/{webhook_id}",
    params(
        ("container_id" = uuid::Uuid, Path, description = "Container UUID"),
        ("webhook_id" = uuid::Uuid, Path, description = "Webhook UUID"),
    ),
    responses(
        (status = 200, description = "Webhook configuration deleted"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "webhooks",
)]
pub async fn delete_config(
    _csrf: CsrfProtected,
    actor: AuthenticatedUser,
    State(state): State<AppState>,
    Path((_container_id, webhook_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ApiResponse<()>>, ApiError> {
    state
        .webhook_service
        .delete_config(&actor, webhook_id)
        .await?;
    Ok(Json(ApiResponse::new(())))
}

/// Query parameters for the list_deliveries endpoint.
#[derive(Debug, Deserialize)]
pub struct DeliveryQuery {
    pub limit: Option<i64>,
}

/// `GET /api/v1/containers/{container_id}/webhooks/{webhook_id}/deliveries` — list deliveries.
#[utoipa::path(
    get,
    path = "/api/v1/containers/{container_id}/webhooks/{webhook_id}/deliveries",
    params(
        ("container_id" = uuid::Uuid, Path, description = "Container UUID"),
        ("webhook_id" = uuid::Uuid, Path, description = "Webhook UUID"),
        ("limit" = Option<i64>, Query, description = "Maximum number of records to return (default 50, max 200)"),
    ),
    responses(
        (status = 200, description = "Webhook delivery records", body = inline(ApiResponse<Vec<WebhookDelivery>>)),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "webhooks",
)]
pub async fn list_deliveries(
    actor: AuthenticatedUser,
    State(state): State<AppState>,
    Path((_container_id, webhook_id)): Path<(Uuid, Uuid)>,
    Query(params): Query<DeliveryQuery>,
) -> Result<Json<ApiResponse<Vec<WebhookDelivery>>>, ApiError> {
    let limit = params.limit.unwrap_or(50).min(200).max(1);
    let deliveries = state
        .webhook_service
        .list_deliveries(&actor, webhook_id, limit)
        .await?;
    Ok(Json(ApiResponse::new(deliveries)))
}

// ---------------------------------------------------------------------------
// Inbound receiver — no CSRF, no AuthenticatedUser
// ---------------------------------------------------------------------------

/// `POST /webhooks/{webhook_id}` — receive an inbound event from a git provider.
///
/// The raw request body is read **before** any JSON deserialization so that the
/// HMAC signature can be verified over the exact bytes the provider signed.
/// No session auth is required — the only auth is the provider's HMAC signature.
#[utoipa::path(
    post,
    path = "/webhooks/{webhook_id}",
    params(("webhook_id" = uuid::Uuid, Path, description = "Webhook UUID")),
    responses(
        (status = 200, description = "Event accepted"),
        (status = 401, description = "HMAC signature invalid or missing"),
        (status = 404, description = "Webhook not found"),
    ),
    tag = "webhooks",
)]
pub async fn receive_webhook(
    Path(webhook_id): Path<Uuid>,
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<ApiResponse<&'static str>>, ApiError> {
    state
        .webhook_service
        .handle_incoming(webhook_id, &headers, &body)
        .await?;
    Ok(Json(ApiResponse::new("ok")))
}
