//! Tracing configuration for structured logs.

use tracing_subscriber::{fmt, EnvFilter};

/// Initializes structured JSON logging for backend components.
pub fn init_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,tower_http=info"));
    fmt()
        .with_env_filter(filter)
        .json()
        .with_current_span(true)
        .init();
}
