-- Add permission flags to programs.
-- can_create_containers: members of this program are allowed to provision containers.
ALTER TABLE programs
    ADD COLUMN IF NOT EXISTS can_create_containers BOOLEAN NOT NULL DEFAULT FALSE;

