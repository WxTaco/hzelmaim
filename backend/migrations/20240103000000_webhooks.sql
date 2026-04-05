-- Webhook auto-deployment configuration.
-- One row per webhook registered on a container.
CREATE TABLE webhook_configs (
    id             UUID        PRIMARY KEY,
    container_id   UUID        NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
    provider       TEXT        NOT NULL CHECK (provider IN ('github', 'forgejo')),
    -- Stored plaintext; required for HMAC-SHA256 re-computation.
    webhook_secret TEXT        NOT NULL,
    -- Deploy only when the push is to this branch (short name, e.g. "main").
    branch         TEXT        NOT NULL,
    -- Absolute path inside the container to cd into before running the command.
    working_dir    TEXT        NOT NULL,
    -- Verbatim shell command executed inside the container via SSH exec channel.
    post_pull_cmd  TEXT        NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delivery log: one row per inbound webhook call.
CREATE TABLE webhook_deliveries (
    id              UUID        PRIMARY KEY,
    webhook_id      UUID        NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
    -- Provider-assigned idempotency key (e.g. X-GitHub-Delivery UUID).
    delivery_id     TEXT        NOT NULL,
    provider        TEXT        NOT NULL,
    event_type      TEXT        NOT NULL,
    branch          TEXT        NOT NULL DEFAULT '',
    head_commit_id  TEXT        NOT NULL DEFAULT '',
    -- pending → running → succeeded | failed | skipped
    status          TEXT        NOT NULL CHECK (status IN ('pending','running','succeeded','failed','skipped')),
    error_message   TEXT,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_webhook_configs_container
    ON webhook_configs (container_id);
CREATE INDEX idx_webhook_deliveries_webhook
    ON webhook_deliveries (webhook_id, received_at DESC);
CREATE INDEX idx_webhook_deliveries_delivery_id
    ON webhook_deliveries (delivery_id);
