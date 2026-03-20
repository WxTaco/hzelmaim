//! JWT token generation and validation for cross-domain authentication.

use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::utils::error::ApiError;

/**
 * JWT claims for access tokens (short-lived, ~15 minutes).
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessTokenClaims {
    pub sub: String, // user_id
    pub email: String,
    /// Full display name from the OIDC `name` claim. May be absent for
    /// tokens minted before this field was introduced.
    #[serde(default)]
    pub display_name: Option<String>,
    /// Profile picture URL from the OIDC `picture` claim.
    #[serde(default)]
    pub picture_url: Option<String>,
    pub session_id: String,
    pub iat: i64, // issued at
    pub exp: i64, // expiration
}

/**
 * JWT claims for refresh tokens (long-lived, ~8 hours).
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefreshTokenClaims {
    pub sub: String, // user_id
    pub session_id: String,
    pub iat: i64,
    pub exp: i64,
}

/**
 * Service for JWT token generation and validation.
 */
pub struct JwtService {
    secret: String,
    access_token_ttl_minutes: i64,
    refresh_token_ttl_hours: i64,
}

impl JwtService {
    /**
     * Creates a new JWT service with the given secret.
     */
    pub fn new(secret: String) -> Self {
        Self {
            secret,
            access_token_ttl_minutes: 15,
            refresh_token_ttl_hours: 8,
        }
    }

    /**
     * Generates an access token (short-lived).
     */
    pub fn generate_access_token(
        &self,
        user_id: Uuid,
        email: String,
        display_name: Option<String>,
        picture_url: Option<String>,
        session_id: Uuid,
    ) -> Result<String, ApiError> {
        let now = Utc::now();
        let claims = AccessTokenClaims {
            sub: user_id.to_string(),
            email,
            display_name,
            picture_url,
            session_id: session_id.to_string(),
            iat: now.timestamp(),
            exp: (now + Duration::minutes(self.access_token_ttl_minutes)).timestamp(),
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.secret.as_bytes()),
        )
        .map_err(|e| ApiError::internal(format!("Token generation failed: {e}")))
    }

    /**
     * Generates a refresh token (long-lived).
     */
    pub fn generate_refresh_token(
        &self,
        user_id: Uuid,
        session_id: Uuid,
    ) -> Result<String, ApiError> {
        let now = Utc::now();
        let claims = RefreshTokenClaims {
            sub: user_id.to_string(),
            session_id: session_id.to_string(),
            iat: now.timestamp(),
            exp: (now + Duration::hours(self.refresh_token_ttl_hours)).timestamp(),
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.secret.as_bytes()),
        )
        .map_err(|e| ApiError::internal(format!("Token generation failed: {e}")))
    }

    /**
     * Validates and decodes an access token.
     */
    pub fn validate_access_token(&self, token: &str) -> Result<AccessTokenClaims, ApiError> {
        decode::<AccessTokenClaims>(
            token,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &Validation::default(),
        )
        .map(|data| data.claims)
        .map_err(|_| ApiError::unauthorized())
    }

    /**
     * Validates and decodes a refresh token.
     */
    pub fn validate_refresh_token(&self, token: &str) -> Result<RefreshTokenClaims, ApiError> {
        decode::<RefreshTokenClaims>(
            token,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &Validation::default(),
        )
        .map(|data| data.claims)
        .map_err(|_| ApiError::unauthorized())
    }
}
