-- Add a `permissions` bitmask column to container_invitations.
--
-- Stores the permission bits the inviter chose to grant. When an invitation is
-- accepted, this bitmask is used to create the ownership row instead of the
-- hard-coded PRESET_VIEWER (3).  Existing rows default to 3 (PERM_VIEW |
-- PERM_READ_METRICS) so that behaviour is unchanged for invitations that were
-- created before this migration.

ALTER TABLE container_invitations
    ADD COLUMN permissions INTEGER NOT NULL DEFAULT 3;
