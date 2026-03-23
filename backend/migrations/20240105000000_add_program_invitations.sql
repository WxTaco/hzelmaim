-- Program invitations table: tracks invitations sent to users for programs.
CREATE TABLE IF NOT EXISTS program_invitations (
    id           UUID        PRIMARY KEY,
    program_id   UUID        NOT NULL REFERENCES programs(id),
    user_id      UUID        NOT NULL REFERENCES users(id),
    invited_by   UUID        NOT NULL REFERENCES users(id),
    invited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    response     TEXT        CHECK (response IN ('accepted', 'declined'))
);

-- Index for the pending-invitations query (user + unanswered).
CREATE INDEX IF NOT EXISTS idx_program_invitations_pending
    ON program_invitations (user_id)
    WHERE response IS NULL;

