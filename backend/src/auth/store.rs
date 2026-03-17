//! Authentication storage abstractions and an in-memory development implementation.

use std::{collections::HashMap, sync::Arc};

use async_trait::async_trait;
use chrono::{Duration, Utc};
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::{
    models::{
        session::{AuthMethod, SessionRecord},
        user::{UserRecord, UserRole, UserStatus},
    },
    utils::error::ApiError,
};

/// Persistence boundary for user and session lookups.
#[async_trait]
pub trait AuthStore: Send + Sync {
    /// Loads a user by id.
    async fn get_user(&self, user_id: Uuid) -> Result<Option<UserRecord>, ApiError>;

    /// Loads a session by id.
    async fn get_session(&self, session_id: Uuid) -> Result<Option<SessionRecord>, ApiError>;

    /// Updates the last-seen timestamp for an active session.
    async fn touch_session(&self, session_id: Uuid) -> Result<(), ApiError>;

    /// Marks a session as revoked.
    async fn revoke_session(&self, session_id: Uuid) -> Result<(), ApiError>;
}

/// Result of seeding a development user and session.
#[derive(Debug, Clone)]
pub struct SeededAuthSession {
    pub user: UserRecord,
    pub session: SessionRecord,
}

/// In-memory auth store used for scaffolding and tests.
#[derive(Debug, Default)]
pub struct InMemoryAuthStore {
    users: Arc<RwLock<HashMap<Uuid, UserRecord>>>,
    sessions: Arc<RwLock<HashMap<Uuid, SessionRecord>>>,
}

impl InMemoryAuthStore {
    /// Creates a new empty in-memory auth store.
    pub fn new() -> Self {
        Self::default()
    }

    /// Seeds a development administrator session for local testing.
    pub async fn seed_demo_admin_session(&self) -> SeededAuthSession {
        let now = Utc::now();
        let user = UserRecord {
            id: Uuid::new_v4(),
            email: "admin@example.internal".into(),
            role: UserRole::Admin,
            status: UserStatus::Active,
            created_at: now,
        };
        let session = SessionRecord {
            id: Uuid::new_v4(),
            user_id: user.id,
            csrf_token: Uuid::new_v4().to_string(),
            auth_method: AuthMethod::Session,
            expires_at: now + Duration::hours(8),
            created_at: now,
            last_seen_at: now,
            revoked_at: None,
        };

        self.users.write().await.insert(user.id, user.clone());
        self.sessions.write().await.insert(session.id, session.clone());

        SeededAuthSession { user, session }
    }

    /// Re-keys a user and its sessions from `old_id` to `new_id`.
    ///
    /// Used when the dev bootstrap discovers the user already exists in
    /// PostgreSQL with a different UUID.
    pub async fn patch_user_id(&self, old_id: Uuid, new_id: Uuid) {
        let mut users = self.users.write().await;
        if let Some(mut user) = users.remove(&old_id) {
            user.id = new_id;
            users.insert(new_id, user);
        }
        let mut sessions = self.sessions.write().await;
        for session in sessions.values_mut() {
            if session.user_id == old_id {
                session.user_id = new_id;
            }
        }
    }
}

#[async_trait]
impl AuthStore for InMemoryAuthStore {
    async fn get_user(&self, user_id: Uuid) -> Result<Option<UserRecord>, ApiError> {
        Ok(self.users.read().await.get(&user_id).cloned())
    }

    async fn get_session(&self, session_id: Uuid) -> Result<Option<SessionRecord>, ApiError> {
        Ok(self.sessions.read().await.get(&session_id).cloned())
    }

    async fn touch_session(&self, session_id: Uuid) -> Result<(), ApiError> {
        if let Some(session) = self.sessions.write().await.get_mut(&session_id) {
            session.last_seen_at = Utc::now();
        }
        Ok(())
    }

    async fn revoke_session(&self, session_id: Uuid) -> Result<(), ApiError> {
        if let Some(session) = self.sessions.write().await.get_mut(&session_id) {
            session.revoked_at = Some(Utc::now());
        }
        Ok(())
    }
}