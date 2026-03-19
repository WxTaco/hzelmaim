//! OIDC authorization code flow service.

use std::{collections::HashMap, sync::Arc};

use chrono::{Duration, Utc};
use openidconnect::reqwest;
use openidconnect::{
    core::{CoreAuthenticationFlow, CoreClient, CoreProviderMetadata},
    AuthorizationCode, ClientId, ClientSecret, CsrfToken, IssuerUrl, Nonce, RedirectUrl, Scope,
    TokenResponse,
};
use tokio::sync::RwLock;
use tracing::info;
use uuid::Uuid;

use crate::{
    auth::store::AuthStore,
    config::AppConfig,
    db::user_repo::UserRepo,
    models::session::{AuthMethod, SessionRecord},
    utils::error::ApiError,
};

/// In-flight OIDC authorization state keyed by the CSRF `state` parameter.
#[derive(Debug, Clone)]
struct PendingAuth {
    nonce: String,
}

/// Service encapsulating the OIDC authorization code flow.
///
/// Stores provider metadata + client credentials and reconstructs the
/// typed client on each operation to avoid carrying complex generic types.
pub struct OidcService {
    metadata: CoreProviderMetadata,
    client_id: ClientId,
    client_secret: Option<ClientSecret>,
    redirect_uri: RedirectUrl,
    http_client: reqwest::Client,
    pending: Arc<RwLock<HashMap<String, PendingAuth>>>,
    user_repo: Arc<dyn UserRepo>,
    auth_store: Arc<dyn AuthStore>,
    session_max_age_secs: i64,
}

/// Macro to build the configured client inline so the compiler can infer the
/// full generic type without us needing to spell it out.
macro_rules! build_client {
    ($self:expr) => {
        CoreClient::from_provider_metadata(
            $self.metadata.clone(),
            $self.client_id.clone(),
            $self.client_secret.clone(),
        )
        .set_redirect_uri($self.redirect_uri.clone())
    };
}

impl OidcService {
    /// Initialises the OIDC service by performing provider discovery.
    pub async fn discover(
        config: &AppConfig,
        user_repo: Arc<dyn UserRepo>,
        auth_store: Arc<dyn AuthStore>,
    ) -> Result<Self, ApiError> {
        let issuer_url = IssuerUrl::new(config.oidc_issuer_url.clone())
            .map_err(|e| ApiError::internal(format!("Invalid OIDC issuer URL: {e}")))?;

        let http_client = reqwest::ClientBuilder::new()
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|e| ApiError::internal(format!("Failed to build HTTP client: {e}")))?;

        let metadata = CoreProviderMetadata::discover_async(issuer_url, &http_client)
            .await
            .map_err(|e| ApiError::internal(format!("OIDC discovery failed: {e}")))?;

        let redirect_uri = RedirectUrl::new(config.oidc_redirect_uri.clone())
            .map_err(|e| ApiError::internal(format!("Invalid OIDC redirect URI: {e}")))?;

        info!("OIDC provider discovered");
        Ok(Self {
            metadata,
            client_id: ClientId::new(config.oidc_client_id.clone()),
            client_secret: Some(ClientSecret::new(config.oidc_client_secret.clone())),
            redirect_uri,
            http_client,
            pending: Arc::new(RwLock::new(HashMap::new())),
            user_repo,
            auth_store,
            session_max_age_secs: 60 * 60 * 8,
        })
    }

    /// Generates the authorization URL and stores pending state.
    pub async fn authorize_url(&self) -> String {
        let client = build_client!(self);
        let (auth_url, csrf_state, nonce) = client
            .authorize_url(
                CoreAuthenticationFlow::AuthorizationCode,
                CsrfToken::new_random,
                Nonce::new_random,
            )
            .add_scope(Scope::new("openid".into()))
            .add_scope(Scope::new("email".into()))
            .add_scope(Scope::new("profile".into()))
            .url();

        self.pending.write().await.insert(
            csrf_state.secret().clone(),
            PendingAuth {
                nonce: nonce.secret().clone(),
            },
        );

        auth_url.to_string()
    }

    /// Exchanges the authorization code for tokens, upserts the user, and
    /// creates a session.
    pub async fn handle_callback(
        &self,
        code: &str,
        state: &str,
    ) -> Result<SessionRecord, ApiError> {
        let pending = self
            .pending
            .write()
            .await
            .remove(state)
            .ok_or_else(|| ApiError::validation("Invalid or expired OIDC state parameter"))?;

        let client = build_client!(self);

        let token_response = client
            .exchange_code(AuthorizationCode::new(code.to_string()))
            .map_err(|e| ApiError::internal(format!("OIDC code exchange config error: {e}")))?
            .request_async(&self.http_client)
            .await
            .map_err(|e| ApiError::internal(format!("OIDC token exchange failed: {e}")))?;

        let id_token = token_response
            .id_token()
            .ok_or_else(|| ApiError::internal("OIDC provider did not return an ID token"))?;

        let verifier = client.id_token_verifier();
        let nonce = Nonce::new(pending.nonce);
        let claims = id_token
            .claims(&verifier, &nonce)
            .map_err(|e| ApiError::internal(format!("ID token verification failed: {e}")))?;

        let subject = claims.subject().to_string();
        let issuer = claims.issuer().to_string();
        let email = claims
            .email()
            .map(|e| e.to_string())
            .unwrap_or_else(|| format!("{}@oidc", subject));

        info!(sub = %subject, email = %email, "OIDC login");

        // Upsert user from OIDC identity (sub stored in oidc_identities.subject)
        let user = self
            .user_repo
            .upsert_oidc_identity(&issuer, &subject, &email)
            .await?;

        let now = Utc::now();
        let session = SessionRecord {
            id: Uuid::new_v4(),
            user_id: user.id,
            csrf_token: Uuid::new_v4().to_string(),
            auth_method: AuthMethod::Oidc,
            expires_at: now + Duration::seconds(self.session_max_age_secs),
            created_at: now,
            last_seen_at: now,
            revoked_at: None,
        };

        self.auth_store.create_session(&session).await?;

        Ok(session)
    }
}
