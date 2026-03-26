-- Personal access tokens for API authentication.

CREATE TABLE IF NOT EXISTS api_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- SHA-256 hex digest of the raw token; never store the plaintext.
    token_hash TEXT NOT NULL UNIQUE,
    -- Display prefix (first 12 chars of the full token, e.g. "hzel_AbCdEfGh").
    prefix TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    -- NULL means the token never expires.
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- Add columns that may be missing if the table was created by an older migration.
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS name        TEXT;
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS token_hash  TEXT;
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS prefix      TEXT;
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS revoked_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id    ON api_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON api_tokens (token_hash);

