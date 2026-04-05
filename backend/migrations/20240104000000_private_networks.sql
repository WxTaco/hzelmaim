-- Private networking schema: per-user isolated Layer 2 bridges on the Proxmox node.
-- Each network maps to one vmbrN Linux bridge. Containers attach via a second NIC (eth1..ethN).

-- Global sequence for Proxmox bridge IDs.
-- Starts at 100 to leave vmbr0–vmbr99 for manually managed infrastructure.
-- IDs are never reused, even after a bridge is deleted.
CREATE SEQUENCE bridge_id_seq START 100 INCREMENT 1;

-- One row per user-created private network.
CREATE TABLE private_networks (
    id              UUID        PRIMARY KEY,
    owner_user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name            TEXT        NOT NULL,
    -- The Linux bridge device name on the Proxmox node, e.g. "vmbr105".
    bridge_name     TEXT        NOT NULL UNIQUE,
    -- The integer N from vmbrN, drawn from bridge_id_seq. Stored separately
    -- so bridge_name can be reconstructed and for human-readable display.
    bridge_id       INTEGER     NOT NULL UNIQUE,
    -- RFC 1918 CIDR chosen by the user at creation, e.g. "10.42.0.0/24".
    -- /16 to /28 are allowed; see NetworkService::validate_cidr.
    cidr            TEXT        NOT NULL,
    -- Lifecycle state: creating → active, or creating → failed.
    -- Deletion path: active → deleting → row removed.
    state           TEXT        NOT NULL
                        CHECK (state IN ('creating', 'active', 'deleting', 'failed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-container membership in a private network.
-- Each row represents one NIC (ethN) added to a container.
CREATE TABLE network_memberships (
    id              UUID        PRIMARY KEY,
    network_id      UUID        NOT NULL REFERENCES private_networks(id) ON DELETE RESTRICT,
    container_id    UUID        NOT NULL REFERENCES containers(id)      ON DELETE RESTRICT,
    -- Host address allocated from the network CIDR, without prefix (e.g. "10.42.0.3").
    private_ip      TEXT        NOT NULL,
    -- Which Proxmox netN slot is used on this container (1–15; 0 is reserved for eth0/public).
    net_index       SMALLINT    NOT NULL CHECK (net_index BETWEEN 1 AND 15),
    -- Lifecycle state.
    state           TEXT        NOT NULL
                        CHECK (state IN ('attaching', 'active', 'detaching', 'failed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A container may belong to each network at most once.
    UNIQUE (network_id, container_id),
    -- Each IP within a network is unique.
    UNIQUE (network_id, private_ip),
    -- Each NIC slot on a container is used by at most one network.
    UNIQUE (container_id, net_index)
);

CREATE INDEX idx_private_networks_owner      ON private_networks (owner_user_id);
CREATE INDEX idx_network_memberships_network ON network_memberships (network_id);
CREATE INDEX idx_network_memberships_ct      ON network_memberships (container_id);
