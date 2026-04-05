-- Container sharing invitations.
--
-- When a container owner invites another user the invitation is stored here.
-- On acceptance, a `viewer` ownership row is inserted into `container_ownerships`
-- so the shared container appears automatically in the invitee's container list
-- and the existing access-control checks continue to work unchanged.

CREATE TABLE container_invitations (
    id           UUID        PRIMARY KEY,
    container_id UUID        NOT NULL REFERENCES containers(id)  ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    invited_by   UUID        NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    invited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    response     TEXT        CHECK (response IN ('accepted', 'declined')),
    -- Prevent duplicate pending invitations for the same (container, user) pair.
    UNIQUE (container_id, user_id)
);

-- Efficient lookup of unanswered invitations for the pending-invitations endpoint.
CREATE INDEX idx_container_invitations_pending
    ON container_invitations (user_id)
    WHERE response IS NULL;
