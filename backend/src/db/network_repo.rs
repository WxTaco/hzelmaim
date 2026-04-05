//! PostgreSQL-backed persistence for private networks and their container memberships.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    db::Pool,
    models::network::{MembershipState, NetworkMembership, NetworkState, PrivateNetwork},
    utils::error::ApiError,
};

/// Persistence boundary for private network operations.
#[async_trait]
pub trait NetworkRepo: Send + Sync {
    /// Draws the next bridge ID from the global DB sequence.
    async fn next_bridge_id(&self) -> Result<i32, ApiError>;

    /// Inserts a new private network record.
    async fn create(&self, net: &PrivateNetwork) -> Result<(), ApiError>;

    /// Lists all active networks owned by a user.
    async fn list_for_user(&self, user_id: Uuid) -> Result<Vec<PrivateNetwork>, ApiError>;

    /// Loads a single network by its UUID.
    async fn get(&self, network_id: Uuid) -> Result<Option<PrivateNetwork>, ApiError>;

    /// Updates the lifecycle state of a network.
    async fn update_state(&self, network_id: Uuid, state: NetworkState) -> Result<(), ApiError>;

    /// Deletes a network record. Fails if memberships still exist (FK constraint).
    async fn delete(&self, network_id: Uuid) -> Result<(), ApiError>;

    /// Lists all memberships for a network.
    async fn list_members(&self, network_id: Uuid) -> Result<Vec<NetworkMembership>, ApiError>;

    /// Lists all networks a container belongs to.
    async fn list_for_container(
        &self,
        container_id: Uuid,
    ) -> Result<Vec<NetworkMembership>, ApiError>;

    /// Inserts a new membership record.
    async fn insert_member(&self, m: &NetworkMembership) -> Result<(), ApiError>;

    /// Updates the lifecycle state of a membership.
    async fn update_member_state(
        &self,
        member_id: Uuid,
        state: MembershipState,
    ) -> Result<(), ApiError>;

    /// Removes a membership record (IP freed by deletion).
    async fn delete_member(&self, network_id: Uuid, container_id: Uuid) -> Result<(), ApiError>;

    /// Returns the private IPs currently allocated in a network.
    async fn used_ips(&self, network_id: Uuid) -> Result<Vec<String>, ApiError>;

    /// Returns the net_index values currently in use for a container.
    async fn used_net_indices(&self, container_id: Uuid) -> Result<Vec<i16>, ApiError>;

    /// Counts active (non-failed, non-deleting) networks globally. Used for limit enforcement.
    async fn count_active(&self) -> Result<i64, ApiError>;

    /// Counts networks owned by a specific user.
    async fn count_for_user(&self, user_id: Uuid) -> Result<i64, ApiError>;

    /// Renames a network.
    async fn rename(&self, network_id: Uuid, name: &str) -> Result<(), ApiError>;
}

/// PostgreSQL implementation of the network repository.
pub struct PgNetworkRepo {
    pool: Pool,
}

impl PgNetworkRepo {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

// --- sqlx row types -------------------------------------------------------

#[derive(sqlx::FromRow)]
struct NetworkRow {
    id: Uuid,
    owner_user_id: Uuid,
    name: String,
    bridge_name: String,
    bridge_id: i32,
    cidr: String,
    state: String,
    created_at: DateTime<Utc>,
}

impl From<NetworkRow> for PrivateNetwork {
    fn from(r: NetworkRow) -> Self {
        Self {
            id: r.id,
            owner_user_id: r.owner_user_id,
            name: r.name,
            bridge_name: r.bridge_name,
            bridge_id: r.bridge_id,
            cidr: r.cidr,
            state: r.state.parse().unwrap_or(NetworkState::Failed),
            created_at: r.created_at,
        }
    }
}

#[derive(sqlx::FromRow)]
struct MemberRow {
    id: Uuid,
    network_id: Uuid,
    container_id: Uuid,
    private_ip: String,
    net_index: i16,
    state: String,
    created_at: DateTime<Utc>,
}

impl From<MemberRow> for NetworkMembership {
    fn from(r: MemberRow) -> Self {
        Self {
            id: r.id,
            network_id: r.network_id,
            container_id: r.container_id,
            private_ip: r.private_ip,
            net_index: r.net_index,
            state: r.state.parse().unwrap_or(MembershipState::Failed),
            created_at: r.created_at,
        }
    }
}


// --- PgNetworkRepo impl ---------------------------------------------------

#[async_trait]
impl NetworkRepo for PgNetworkRepo {
    async fn next_bridge_id(&self) -> Result<i32, ApiError> {
        let (id,): (i64,) = sqlx::query_as("SELECT nextval('bridge_id_seq')")
            .fetch_one(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Failed to get next bridge id: {e}")))?;
        Ok(id as i32)
    }

    async fn create(&self, net: &PrivateNetwork) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO private_networks \
             (id, owner_user_id, name, bridge_name, bridge_id, cidr, state, created_at) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        )
        .bind(net.id)
        .bind(net.owner_user_id)
        .bind(&net.name)
        .bind(&net.bridge_name)
        .bind(net.bridge_id)
        .bind(&net.cidr)
        .bind(net.state.as_str())
        .bind(net.created_at)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn list_for_user(&self, user_id: Uuid) -> Result<Vec<PrivateNetwork>, ApiError> {
        let rows = sqlx::query_as::<_, NetworkRow>(
            "SELECT id, owner_user_id, name, bridge_name, bridge_id, cidr, state, created_at \
             FROM private_networks WHERE owner_user_id = $1 \
             ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn get(&self, network_id: Uuid) -> Result<Option<PrivateNetwork>, ApiError> {
        let row = sqlx::query_as::<_, NetworkRow>(
            "SELECT id, owner_user_id, name, bridge_name, bridge_id, cidr, state, created_at \
             FROM private_networks WHERE id = $1",
        )
        .bind(network_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.map(Into::into))
    }

    async fn update_state(&self, network_id: Uuid, state: NetworkState) -> Result<(), ApiError> {
        sqlx::query("UPDATE private_networks SET state = $1 WHERE id = $2")
            .bind(state.as_str())
            .bind(network_id)
            .execute(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn delete(&self, network_id: Uuid) -> Result<(), ApiError> {
        sqlx::query("DELETE FROM private_networks WHERE id = $1")
            .bind(network_id)
            .execute(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Database error (delete network): {e}")))?;
        Ok(())
    }

    async fn list_members(&self, network_id: Uuid) -> Result<Vec<NetworkMembership>, ApiError> {
        let rows = sqlx::query_as::<_, MemberRow>(
            "SELECT id, network_id, container_id, private_ip, net_index, state, created_at \
             FROM network_memberships WHERE network_id = $1 ORDER BY created_at ASC",
        )
        .bind(network_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn list_for_container(
        &self,
        container_id: Uuid,
    ) -> Result<Vec<NetworkMembership>, ApiError> {
        let rows = sqlx::query_as::<_, MemberRow>(
            "SELECT id, network_id, container_id, private_ip, net_index, state, created_at \
             FROM network_memberships WHERE container_id = $1 ORDER BY created_at ASC",
        )
        .bind(container_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn insert_member(&self, m: &NetworkMembership) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO network_memberships \
             (id, network_id, container_id, private_ip, net_index, state, created_at) \
             VALUES ($1, $2, $3, $4, $5, $6, $7)",
        )
        .bind(m.id)
        .bind(m.network_id)
        .bind(m.container_id)
        .bind(&m.private_ip)
        .bind(m.net_index)
        .bind(m.state.as_str())
        .bind(m.created_at)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn update_member_state(
        &self,
        member_id: Uuid,
        state: MembershipState,
    ) -> Result<(), ApiError> {
        sqlx::query("UPDATE network_memberships SET state = $1 WHERE id = $2")
            .bind(state.as_str())
            .bind(member_id)
            .execute(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn delete_member(&self, network_id: Uuid, container_id: Uuid) -> Result<(), ApiError> {
        sqlx::query(
            "DELETE FROM network_memberships WHERE network_id = $1 AND container_id = $2",
        )
        .bind(network_id)
        .bind(container_id)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error (delete member): {e}")))?;
        Ok(())
    }

    async fn used_ips(&self, network_id: Uuid) -> Result<Vec<String>, ApiError> {
        let rows: Vec<(String,)> = sqlx::query_as(
            "SELECT private_ip FROM network_memberships WHERE network_id = $1",
        )
        .bind(network_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(rows.into_iter().map(|(ip,)| ip).collect())
    }

    async fn used_net_indices(&self, container_id: Uuid) -> Result<Vec<i16>, ApiError> {
        let rows: Vec<(i16,)> = sqlx::query_as(
            "SELECT net_index FROM network_memberships WHERE container_id = $1",
        )
        .bind(container_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(rows.into_iter().map(|(i,)| i).collect())
    }

    async fn count_active(&self) -> Result<i64, ApiError> {
        let (count,): (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM private_networks WHERE state IN ('creating', 'active')",
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(count)
    }

    async fn count_for_user(&self, user_id: Uuid) -> Result<i64, ApiError> {
        let (count,): (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM private_networks \
             WHERE owner_user_id = $1 AND state IN ('creating', 'active')",
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(count)
    }

    async fn rename(&self, network_id: Uuid, name: &str) -> Result<(), ApiError> {
        sqlx::query("UPDATE private_networks SET name = $1 WHERE id = $2")
            .bind(name)
            .bind(network_id)
            .execute(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }
}
