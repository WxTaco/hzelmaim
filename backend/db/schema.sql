-- Initial PostgreSQL schema for the platform control plane.

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    picture_url  TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    status TEXT NOT NULL CHECK (status IN ('active', 'disabled')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE oidc_identities (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issuer TEXT NOT NULL,
    subject TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (issuer, subject)
);

CREATE TABLE containers (
    id UUID PRIMARY KEY,
    proxmox_ctid INTEGER NOT NULL UNIQUE,
    node_name TEXT NOT NULL,
    name TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('provisioning', 'running', 'stopped', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE container_ownerships (
    container_id UUID NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_level TEXT NOT NULL CHECK (access_level IN ('owner', 'operator', 'viewer')),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (container_id, user_id)
);

CREATE TABLE command_definitions (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    program TEXT NOT NULL,
    args JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE command_execution_logs (
    id UUID PRIMARY KEY,
    container_id UUID NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    program TEXT NOT NULL,
    args JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
    stdout TEXT NOT NULL DEFAULT '',
    stderr TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    container_id UUID REFERENCES containers(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    outcome TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token TEXT NOT NULL,
    auth_method TEXT NOT NULL CHECK (auth_method IN ('session', 'oidc')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_container_ownerships_user_id ON container_ownerships (user_id);
CREATE INDEX idx_command_execution_logs_container_id ON command_execution_logs (container_id);
CREATE INDEX idx_command_execution_logs_requested_by ON command_execution_logs (requested_by);
CREATE INDEX idx_audit_logs_user_id_created_at ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_container_id_created_at ON audit_logs (container_id, created_at DESC);
CREATE INDEX idx_oidc_identities_user_id ON oidc_identities (user_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions (expires_at);