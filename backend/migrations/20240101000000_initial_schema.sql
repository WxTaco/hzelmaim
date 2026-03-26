-- Consolidated initial schema for the platform control plane.
-- Single source of truth — all tables, columns, constraints, and indexes.

 
-- Users
 
CREATE TABLE users (
    id           UUID        PRIMARY KEY,
    email        TEXT        NOT NULL UNIQUE,
    display_name TEXT,
    picture_url  TEXT,
    role         TEXT        NOT NULL CHECK (role IN ('admin', 'user')),
    status       TEXT        NOT NULL CHECK (status IN ('active', 'disabled')) DEFAULT 'active',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

 
-- OIDC identities
 
CREATE TABLE oidc_identities (
    id         UUID        PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issuer     TEXT        NOT NULL,
    subject    TEXT        NOT NULL,
    email      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (issuer, subject)
);

 
-- Sessions  (auth_method includes 'pat' for PAT-backed virtual sessions)
 
CREATE TABLE user_sessions (
    id          UUID        PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token  TEXT        NOT NULL,
    auth_method TEXT        NOT NULL CHECK (auth_method IN ('session', 'oidc', 'pat')),
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ
);

 
-- Containers
 
CREATE TABLE containers (
    id           UUID        PRIMARY KEY,
    proxmox_ctid INTEGER     NOT NULL UNIQUE,
    node_name    TEXT        NOT NULL,
    name         TEXT        NOT NULL,
    cpu_cores    SMALLINT    NOT NULL DEFAULT 1,
    memory_mb    INTEGER     NOT NULL DEFAULT 512,
    disk_gb      INTEGER     NOT NULL DEFAULT 18,
    state        TEXT        NOT NULL CHECK (state IN ('provisioning', 'running', 'stopped', 'failed')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE container_ownerships (
    container_id UUID    NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
    user_id      UUID    NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    access_level TEXT    NOT NULL CHECK (access_level IN ('owner', 'operator', 'viewer')),
    is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (container_id, user_id)
);

 
-- Commands
 
CREATE TABLE command_definitions (
    id            UUID        PRIMARY KEY,
    owner_user_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    program       TEXT        NOT NULL,
    args          JSONB       NOT NULL DEFAULT '[]'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE command_execution_logs (
    id           UUID        PRIMARY KEY,
    container_id UUID        NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
    requested_by UUID        NOT NULL REFERENCES users(id)      ON DELETE RESTRICT,
    program      TEXT        NOT NULL,
    args         JSONB       NOT NULL DEFAULT '[]'::jsonb,
    status       TEXT        NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
    stdout       TEXT        NOT NULL DEFAULT '',
    stderr       TEXT        NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

 
-- Audit log
 
CREATE TABLE audit_logs (
    id           UUID        PRIMARY KEY,
    user_id      UUID        REFERENCES users(id)      ON DELETE SET NULL,
    container_id UUID        REFERENCES containers(id) ON DELETE SET NULL,
    action       TEXT        NOT NULL,
    outcome      TEXT        NOT NULL,
    metadata     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Programs & invitations (RBAC)
 
CREATE TABLE programs (
    id                    UUID        PRIMARY KEY,
    name                  TEXT        NOT NULL,
    description           TEXT        NOT NULL,
    created_by            UUID        NOT NULL REFERENCES users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    can_create_containers BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE TABLE program_invitations (
    id           UUID        PRIMARY KEY,
    program_id   UUID        NOT NULL REFERENCES programs(id),
    user_id      UUID        NOT NULL REFERENCES users(id),
    invited_by   UUID        NOT NULL REFERENCES users(id),
    invited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    response     TEXT        CHECK (response IN ('accepted', 'declined'))
);

 
-- Personal access tokens
 
CREATE TABLE api_tokens (
    id           UUID        PRIMARY KEY,
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT        NOT NULL,
    token_hash   TEXT        NOT NULL UNIQUE,
    prefix       TEXT        NOT NULL,
    last_used_at TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at   TIMESTAMPTZ
);

 
-- Indexes
 
CREATE INDEX idx_oidc_identities_user_id             ON oidc_identities (user_id);
CREATE INDEX idx_user_sessions_user_id               ON user_sessions (user_id);
CREATE INDEX idx_user_sessions_expires_at            ON user_sessions (expires_at);
CREATE INDEX idx_container_ownerships_user_id        ON container_ownerships (user_id);
CREATE INDEX idx_command_execution_logs_container_id ON command_execution_logs (container_id);
CREATE INDEX idx_command_execution_logs_requested_by ON command_execution_logs (requested_by);
CREATE INDEX idx_audit_logs_user_id_created_at       ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_container_id_created_at  ON audit_logs (container_id, created_at DESC);
CREATE INDEX idx_program_invitations_pending         ON program_invitations (user_id) WHERE response IS NULL;
CREATE INDEX idx_api_tokens_user_id                  ON api_tokens (user_id);
CREATE INDEX idx_api_tokens_token_hash               ON api_tokens (token_hash);

