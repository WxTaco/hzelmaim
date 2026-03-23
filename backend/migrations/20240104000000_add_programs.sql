-- Programs table: each row represents a program that users can be invited to.
CREATE TABLE IF NOT EXISTS programs (
    id          UUID        PRIMARY KEY,
    name        TEXT        NOT NULL,
    description TEXT        NOT NULL,
    created_by  UUID        NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

