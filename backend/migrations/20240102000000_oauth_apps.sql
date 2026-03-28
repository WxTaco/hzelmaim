-- OAuth 2.0 application registrations, authorization codes, and refresh tokens.

 
-- OAuth application registrations
 
CREATE TABLE oauth_applications (
    id                   UUID        PRIMARY KEY,
    owner_user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                 TEXT        NOT NULL,
    description          TEXT,
    -- client_id is the public identifier shared in authorization URLs.
    client_id            UUID        NOT NULL UNIQUE,
    -- SHA-256 hex digest of the raw client secret.
    client_secret_hash   TEXT        NOT NULL,
    -- First 12 characters of the raw secret for display purposes.
    client_secret_prefix TEXT        NOT NULL,
    -- Allowed redirect URIs; redirect_uri on authorize must exactly match one.
    redirect_uris        TEXT[]      NOT NULL DEFAULT '{}',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Soft delete: set when the owner deletes the app.
    revoked_at           TIMESTAMPTZ
);

 
-- Short-lived authorization codes (10-minute TTL, single-use)
 
CREATE TABLE oauth_authorization_codes (
    id           UUID        PRIMARY KEY,
    app_id       UUID        NOT NULL REFERENCES oauth_applications(id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- SHA-256 hex digest of the raw code value.
    code_hash    TEXT        NOT NULL UNIQUE,
    -- Must match the redirect_uri used in the authorize request.
    redirect_uri TEXT        NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    -- Set atomically when the code is exchanged; prevents replay.
    used_at      TIMESTAMPTZ
);

 
-- Long-lived OAuth refresh tokens
 
CREATE TABLE oauth_refresh_tokens (
    id           UUID        PRIMARY KEY,
    app_id       UUID        NOT NULL REFERENCES oauth_applications(id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- SHA-256 hex digest of the raw refresh token value.
    token_hash   TEXT        NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ
);

 
-- Indexes
 
CREATE INDEX idx_oauth_applications_owner_user_id ON oauth_applications (owner_user_id);
CREATE INDEX idx_oauth_applications_client_id     ON oauth_applications (client_id);
CREATE INDEX idx_oauth_auth_codes_app_id          ON oauth_authorization_codes (app_id);
CREATE INDEX idx_oauth_auth_codes_code_hash       ON oauth_authorization_codes (code_hash);
CREATE INDEX idx_oauth_refresh_tokens_app_id      ON oauth_refresh_tokens (app_id);
CREATE INDEX idx_oauth_refresh_tokens_user_id     ON oauth_refresh_tokens (user_id);
CREATE INDEX idx_oauth_refresh_tokens_token_hash  ON oauth_refresh_tokens (token_hash);
