-- Adds an integer bitmask `permissions` column to `container_ownerships`.
--
-- Bit layout (matches models/container.rs constants):
--   0x01  PERM_VIEW
--   0x02  PERM_READ_METRICS
--   0x04  PERM_START_STOP
--   0x08  PERM_TERMINAL
--   0x10  PERM_WEBHOOKS
--   0x20  PERM_NETWORKS
--   0x40  PERM_SHARE
--   0x80  PERM_DELETE
--
-- Named presets:
--   VIEWER   = 0x01 | 0x02              = 3
--   OPERATOR = 0x01|0x02|0x04|0x08|0x10|0x20 = 63
--   OWNER    = 0xFF                     = 255

ALTER TABLE container_ownerships
    ADD COLUMN permissions INTEGER NOT NULL DEFAULT 0;

-- Backfill from the existing access_level string column (kept for reversibility).
UPDATE container_ownerships
SET permissions = CASE access_level
    WHEN 'owner'    THEN 255
    WHEN 'operator' THEN 63
    WHEN 'viewer'   THEN 3
    ELSE 0
END;

-- Remove the DEFAULT now that all rows are populated; the application always
-- supplies an explicit value on INSERT.
ALTER TABLE container_ownerships ALTER COLUMN permissions DROP DEFAULT;

-- DEPRECATED: access_level is superseded by permissions but is kept so this
-- migration remains reversible without data loss.  Do not use it for new
-- authorization checks.
COMMENT ON COLUMN container_ownerships.access_level IS
    'DEPRECATED — use the permissions integer column instead';
