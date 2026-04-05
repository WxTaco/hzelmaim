//! PostgreSQL-backed container persistence.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    db::Pool,
    models::container::{
        AccessLevel, ContainerInvitation, ContainerRecord, ContainerState,
        ContainerWithPermissions, PendingContainerInvitationView, Permissions,
    },
    utils::error::ApiError,
};

/// Persistence boundary for container operations.
#[async_trait]
pub trait ContainerRepo: Send + Sync {
    /// Lists containers accessible to a user, each annotated with that user's
    /// permission bitmask drawn from `container_ownerships.permissions`.
    async fn list_for_user(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<ContainerWithPermissions>, ApiError>;

    /// Lists all containers (used by background sync).
    async fn list_all(&self) -> Result<Vec<ContainerRecord>, ApiError>;

    /// Loads a container by id.
    async fn get(&self, container_id: Uuid) -> Result<Option<ContainerRecord>, ApiError>;

    /// Inserts a new container and creates the primary ownership record,
    /// writing both the legacy `access_level` string and the `permissions` bitmask.
    async fn create(&self, record: &ContainerRecord, owner_user_id: Uuid) -> Result<(), ApiError>;

    /// Updates the lifecycle state of a container.
    async fn update_state(&self, container_id: Uuid, state: ContainerState)
        -> Result<(), ApiError>;

    /// Checks whether a user has at least the given access level to a container.
    ///
    /// **Deprecated** — prefer `get_permissions` + `Permissions::has` for new code.
    /// Kept so that the webhook and network services can be migrated incrementally.
    async fn check_access(
        &self,
        container_id: Uuid,
        user_id: Uuid,
        minimum: AccessLevel,
    ) -> Result<bool, ApiError>;

    // ── Permission bitmask helpers ────────────────────────────────────────────

    /// Returns the integer permission bitmask for a (container, user) pair.
    /// Returns `Permissions(0)` when no ownership row exists.
    async fn get_permissions(
        &self,
        container_id: Uuid,
        user_id: Uuid,
    ) -> Result<Permissions, ApiError>;

    /// Overwrites the permission bitmask for an existing (container, user) pair.
    async fn set_permissions(
        &self,
        container_id: Uuid,
        user_id: Uuid,
        permissions: Permissions,
    ) -> Result<(), ApiError>;

    // ── Container sharing invitations ────────────────────────────────────────

    /// Resolves an email address to a user id (returns `None` if not found).
    async fn find_user_by_email(&self, email: &str) -> Result<Option<Uuid>, ApiError>;

    /// Inserts a new container-sharing invitation record.
    async fn create_container_invitation(
        &self,
        inv: &ContainerInvitation,
    ) -> Result<(), ApiError>;

    /// Returns all unanswered container-sharing invitations addressed to `user_id`.
    async fn pending_container_invitations(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<PendingContainerInvitationView>, ApiError>;

    /// Loads a single container-sharing invitation by its id.
    async fn get_container_invitation(
        &self,
        id: Uuid,
    ) -> Result<Option<ContainerInvitation>, ApiError>;

    /// Records the user's response and, when accepted, grants the permissions
    /// stored on the invitation.
    ///
    /// The update and the optional ownership insert are wrapped in a single
    /// transaction so that the invitation state and the ownership row are
    /// always consistent.
    async fn respond_to_container_invitation(
        &self,
        id: Uuid,
        container_id: Uuid,
        user_id: Uuid,
        response: &str,
        permissions: i32,
    ) -> Result<(), ApiError>;
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

    async fn list_for_user(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<ContainerWithPermissions>, ApiError> {
        #[derive(sqlx::FromRow)]
        struct ContainerWithPermsRow {
            id: Uuid,
            proxmox_ctid: i32,
            node_name: String,
            name: String,
            cpu_cores: i16,
            memory_mb: i32,
            disk_gb: i32,
            state: String,
            created_at: DateTime<Utc>,
            permissions: i32,
        }

        let rows = sqlx::query_as::<_, ContainerWithPermsRow>(
            r#"SELECT c.id, c.proxmox_ctid, c.node_name, c.name,
                      c.cpu_cores, c.memory_mb, c.disk_gb,
                      c.state, c.created_at,
                      co.permissions
               FROM containers c
               JOIN container_ownerships co ON co.container_id = c.id
               WHERE co.user_id = $1
               ORDER BY c.created_at DESC"#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        Ok(rows
            .into_iter()
            .map(|r| ContainerWithPermissions {
                container: ContainerRecord {
                    id: r.id,
                    proxmox_ctid: r.proxmox_ctid,
                    name: r.name,
                    node_name: r.node_name,
                    cpu_cores: r.cpu_cores,
                    memory_mb: r.memory_mb,
                    disk_gb: r.disk_gb,
                    state: parse_state(&r.state),
                    created_at: r.created_at,
                },
                permissions: r.permissions,
            })
            .collect())
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
            "INSERT INTO container_ownerships \
             (container_id, user_id, access_level, is_primary, permissions) \
             VALUES ($1, $2, 'owner', TRUE, $3)",
        )
        .bind(record.id)
        .bind(owner_user_id)
        .bind(crate::models::container::PRESET_OWNER)
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
            "SELECT COUNT(*) FROM container_ownerships \
             WHERE container_id = $1 AND user_id = $2 AND access_level = ANY($3)",
        )
        .bind(container_id)
        .bind(user_id)
        .bind(&levels)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(count.0 > 0)
    }

    async fn get_permissions(
        &self,
        container_id: Uuid,
        user_id: Uuid,
    ) -> Result<Permissions, ApiError> {
        let row: Option<(i32,)> = sqlx::query_as(
            "SELECT permissions FROM container_ownerships \
             WHERE container_id = $1 AND user_id = $2",
        )
        .bind(container_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.map(|(p,)| Permissions(p)).unwrap_or(Permissions(0)))
    }

    async fn set_permissions(
        &self,
        container_id: Uuid,
        user_id: Uuid,
        permissions: Permissions,
    ) -> Result<(), ApiError> {
        sqlx::query(
            "UPDATE container_ownerships SET permissions = $1 \
             WHERE container_id = $2 AND user_id = $3",
        )
        .bind(permissions.0)
        .bind(container_id)
        .bind(user_id)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    // ── Container sharing invitations ────────────────────────────────────────

    async fn find_user_by_email(&self, email: &str) -> Result<Option<Uuid>, ApiError> {
        let row: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM users WHERE email = $1")
            .bind(email)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(row.map(|(id,)| id))
    }

    async fn create_container_invitation(
        &self,
        inv: &ContainerInvitation,
    ) -> Result<(), ApiError> {
        sqlx::query(
            "INSERT INTO container_invitations \
             (id, container_id, user_id, invited_by, invited_at, permissions) \
             VALUES ($1, $2, $3, $4, $5, $6)",
        )
        .bind(inv.id)
        .bind(inv.container_id)
        .bind(inv.user_id)
        .bind(inv.invited_by)
        .bind(inv.invited_at)
        .bind(inv.permissions)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn pending_container_invitations(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<PendingContainerInvitationView>, ApiError> {
        #[derive(sqlx::FromRow)]
        struct PendingRow {
            id: Uuid,
            container_id: Uuid,
            container_name: String,
            invited_by_display_name: Option<String>,
            invited_by_email: String,
            invited_at: chrono::DateTime<chrono::Utc>,
            permissions: i32,
        }

        let rows = sqlx::query_as::<_, PendingRow>(
            r#"SELECT ci.id, ci.container_id,
                      c.name  AS container_name,
                      u.display_name AS invited_by_display_name,
                      u.email        AS invited_by_email,
                      ci.invited_at,
                      ci.permissions
               FROM container_invitations ci
               JOIN containers c ON c.id = ci.container_id
               JOIN users      u ON u.id = ci.invited_by
               WHERE ci.user_id = $1 AND ci.response IS NULL
               ORDER BY ci.invited_at ASC"#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        Ok(rows
            .into_iter()
            .map(|r| PendingContainerInvitationView {
                id: r.id,
                container_id: r.container_id,
                container_name: r.container_name,
                invited_by_display_name: r.invited_by_display_name,
                invited_by_email: r.invited_by_email,
                invited_at: r.invited_at,
                permissions: r.permissions,
            })
            .collect())
    }

    async fn get_container_invitation(
        &self,
        id: Uuid,
    ) -> Result<Option<ContainerInvitation>, ApiError> {
        sqlx::query_as::<_, ContainerInvitation>(
            "SELECT id, container_id, user_id, invited_by, invited_at, responded_at, response, permissions \
             FROM container_invitations WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))
    }

    async fn respond_to_container_invitation(
        &self,
        id: Uuid,
        container_id: Uuid,
        user_id: Uuid,
        response: &str,
        permissions: i32,
    ) -> Result<(), ApiError> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        sqlx::query(
            "UPDATE container_invitations \
             SET response = $1, responded_at = $2 \
             WHERE id = $3",
        )
        .bind(response)
        .bind(chrono::Utc::now())
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;

        if response == "accepted" {
            // Derive the closest legacy access_level string from the bitmask.
            // The string column is kept for reversibility; the bitmask is
            // authoritative for all access checks.
            let access_level = crate::models::container::Permissions(permissions)
                .to_preset_name()
                .unwrap_or("viewer");
            sqlx::query(
                "INSERT INTO container_ownerships \
                 (container_id, user_id, access_level, is_primary, permissions) \
                 VALUES ($1, $2, $3, FALSE, $4) \
                 ON CONFLICT (container_id, user_id) DO NOTHING",
            )
            .bind(container_id)
            .bind(user_id)
            .bind(access_level)
            .bind(permissions)
            .execute(&mut *tx)
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        }

        tx.commit()
            .await
            .map_err(|e| ApiError::internal(format!("Database error: {e}")))?;
        Ok(())
    }
}
