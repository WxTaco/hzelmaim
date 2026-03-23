//! PostgreSQL-backed container persistence.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    db::Pool,
    models::container::{AccessLevel, ContainerRecord, ContainerState},
    utils::error::ApiError,
};

/// Persistence boundary for container operations.
#[async_trait]
pub trait ContainerRepo: Send + Sync {
    /// Lists containers accessible to a user (via container_ownerships).
    async fn list_for_user(&self, user_id: Uuid) -> Result<Vec<ContainerRecord>, ApiError>;

    /// Lists all containers (used by background sync).
    async fn list_all(&self) -> Result<Vec<ContainerRecord>, ApiError>;

    /// Loads a container by id.
    async fn get(&self, container_id: Uuid) -> Result<Option<ContainerRecord>, ApiError>;

    /// Inserts a new container and creates the primary ownership record.
    async fn create(&self, record: &ContainerRecord, owner_user_id: Uuid) -> Result<(), ApiError>;

    /// Updates the lifecycle state of a container.
    async fn update_state(&self, container_id: Uuid, state: ContainerState)
        -> Result<(), ApiError>;

    /// Checks whether a user has at least the given access level to a container.
    async fn check_access(
        &self,
        container_id: Uuid,
        user_id: Uuid,
        minimum: AccessLevel,
    ) -> Result<bool, ApiError>;
}

/// PostgreSQL implementation of the container repository.
pub struct PgContainerRepo {
    pool: Pool,
}

impl PgContainerRepo {
    /// Creates a new PostgreSQL container repository.
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

#[derive(sqlx::FromRow)]
struct ContainerRow {
    id: Uuid,
    proxmox_ctid: i32,
    node_name: String,
    name: String,
    cpu_cores: i16,
    memory_mb: i32,
    disk_gb: i32,
    state: String,
    created_at: DateTime<Utc>,
}

fn parse_state(s: &str) -> ContainerState {
    match s {
        "running" => ContainerState::Running,
        "stopped" => ContainerState::Stopped,
        "failed" => ContainerState::Failed,
        _ => ContainerState::Provisioning,
    }
}

fn state_str(s: &ContainerState) -> &'static str {
    match s {
        ContainerState::Provisioning => "provisioning",
        ContainerState::Running => "running",
        ContainerState::Stopped => "stopped",
        ContainerState::Failed => "failed",
    }
}

impl From<ContainerRow> for ContainerRecord {
    fn from(row: ContainerRow) -> Self {
        Self {
            id: row.id,
            proxmox_ctid: row.proxmox_ctid,
            name: row.name,
            node_name: row.node_name,
            cpu_cores: row.cpu_cores,
            memory_mb: row.memory_mb,
            disk_gb: row.disk_gb,
            state: parse_state(&row.state),
            created_at: row.created_at,
        }
    }
}

#[async_trait]
impl ContainerRepo for PgContainerRepo {
    async fn list_all(&self) -> Result<Vec<ContainerRecord>, ApiError> {
        let rows = sqlx::query_as::<_, ContainerRow>(
            "SELECT id, proxmox_ctid, node_name, name, cpu_cores, memory_mb, disk_gb, state, created_at \
             FROM containers ORDER BY created_at DESC",
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn list_for_user(&self, user_id: Uuid) -> Result<Vec<ContainerRecord>, ApiError> {
        let rows = sqlx::query_as::<_, ContainerRow>(
            r#"SELECT c.id, c.proxmox_ctid, c.node_name, c.name,
                      c.cpu_cores, c.memory_mb, c.disk_gb,
                      c.state, c.created_at
               FROM containers c
               JOIN container_ownerships co ON co.container_id = c.id
               WHERE co.user_id = $1
               ORDER BY c.created_at DESC"#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn get(&self, container_id: Uuid) -> Result<Option<ContainerRecord>, ApiError> {
        let row = sqlx::query_as::<_, ContainerRow>(
            "SELECT id, proxmox_ctid, node_name, name, cpu_cores, memory_mb, disk_gb, state, created_at \
             FROM containers WHERE id = $1",
        )
        .bind(container_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        Ok(row.map(Into::into))
    }

    async fn create(&self, record: &ContainerRecord, owner_user_id: Uuid) -> Result<(), ApiError> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        sqlx::query(
            "INSERT INTO containers \
             (id, proxmox_ctid, node_name, name, cpu_cores, memory_mb, disk_gb, state, created_at) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        )
        .bind(record.id)
        .bind(record.proxmox_ctid)
        .bind(&record.node_name)
        .bind(&record.name)
        .bind(record.cpu_cores)
        .bind(record.memory_mb)
        .bind(record.disk_gb)
        .bind(state_str(&record.state))
        .bind(record.created_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        sqlx::query(
            "INSERT INTO container_ownerships (container_id, user_id, access_level, is_primary) VALUES ($1, $2, 'owner', TRUE)",
        )
        .bind(record.id)
        .bind(owner_user_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        tx.commit()
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn update_state(
        &self,
        container_id: Uuid,
        state: ContainerState,
    ) -> Result<(), ApiError> {
        sqlx::query("UPDATE containers SET state = $1 WHERE id = $2")
            .bind(state_str(&state))
            .bind(container_id)
            .execute(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn check_access(
        &self,
        container_id: Uuid,
        user_id: Uuid,
        minimum: AccessLevel,
    ) -> Result<bool, ApiError> {
        let levels: Vec<&str> = match minimum {
            AccessLevel::Viewer => vec!["owner", "operator", "viewer"],
            AccessLevel::Operator => vec!["owner", "operator"],
            AccessLevel::Owner => vec!["owner"],
        };
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM container_ownerships WHERE container_id = $1 AND user_id = $2 AND access_level = ANY($3)",
        )
        .bind(container_id)
        .bind(user_id)
        .bind(&levels)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(count.0 > 0)
    }
}
