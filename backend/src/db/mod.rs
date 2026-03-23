//! Database connection pool and repository implementations.

pub mod audit_repo;
pub mod command_repo;
pub mod container_repo;
pub mod pg_auth_store;
pub mod program_repo;
pub mod user_repo;

use sqlx::postgres::PgPoolOptions;

/// Type alias for the application-wide connection pool.
pub type Pool = sqlx::PgPool;

/// Creates a connection pool from the provided database URL.
pub async fn create_pool(database_url: &str) -> Result<Pool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(20)
        .connect(database_url)
        .await
}

/// Runs embedded sqlx migrations against the pool.
pub async fn run_migrations(pool: &Pool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("./migrations").run(pool).await
}
