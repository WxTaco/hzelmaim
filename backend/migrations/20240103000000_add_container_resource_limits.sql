-- Stores the provisioned resource limits alongside each container record so
-- the dashboard can display them without a round-trip to Proxmox.
-- Defaults mirror the server-side defaults used at creation time.
ALTER TABLE containers
    ADD COLUMN IF NOT EXISTS cpu_cores SMALLINT  NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS memory_mb INTEGER   NOT NULL DEFAULT 512,
    ADD COLUMN IF NOT EXISTS disk_gb   INTEGER   NOT NULL DEFAULT 18;

