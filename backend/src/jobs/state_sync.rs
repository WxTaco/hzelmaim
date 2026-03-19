//! Background task that reconciles container states between the DB and Proxmox.
//!
//! Runs on a configurable interval, queries all containers from the DB,
//! fetches their actual status from Proxmox, and updates any mismatches.

use std::sync::Arc;
use std::time::Duration;

use tokio::time;
use tracing::{debug, error, info, warn};

use crate::{
    db::container_repo::ContainerRepo,
    models::container::ContainerState,
    proxmox::{client::ProxmoxClient, types::ContainerRuntimeStatus},
};

/// Spawns the background state sync loop.
///
/// The task runs every `interval` and reconciles the DB state with Proxmox
/// for all tracked containers. It will run until the runtime shuts down.
pub fn spawn_state_sync(
    containers: Arc<dyn ContainerRepo>,
    proxmox: Arc<dyn ProxmoxClient>,
    interval: Duration,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let mut ticker = time::interval(interval);
        // Don't pile up ticks if a sync round takes longer than the interval.
        ticker.set_missed_tick_behavior(time::MissedTickBehavior::Skip);

        info!(
            interval_secs = interval.as_secs(),
            "state sync task started"
        );

        loop {
            ticker.tick().await;
            sync_once(&containers, &proxmox).await;
        }
    })
}

/// Single reconciliation pass.
async fn sync_once(containers: &Arc<dyn ContainerRepo>, proxmox: &Arc<dyn ProxmoxClient>) {
    let all = match containers.list_all().await {
        Ok(list) => list,
        Err(e) => {
            error!(error = %e.message, "state sync: failed to list containers");
            return;
        }
    };

    if all.is_empty() {
        return;
    }

    debug!(count = all.len(), "state sync: checking containers");

    for container in &all {
        let actual = match proxmox.container_status(container.proxmox_ctid).await {
            Ok(status) => status,
            Err(e) => {
                warn!(
                    ctid = container.proxmox_ctid,
                    error = %e.message,
                    "state sync: failed to query Proxmox status"
                );
                continue;
            }
        };

        let new_state = match actual {
            ContainerRuntimeStatus::Running => ContainerState::Running,
            ContainerRuntimeStatus::Stopped => ContainerState::Stopped,
            ContainerRuntimeStatus::Unknown => continue, // Don't overwrite with unknown
        };

        // Only update if there's a mismatch (and the container isn't in a
        // transient "provisioning" state — those are handled by the create flow).
        let should_update = match (&container.state, &new_state) {
            (ContainerState::Running, ContainerState::Running) => false,
            (ContainerState::Stopped, ContainerState::Stopped) => false,
            (ContainerState::Provisioning, _) => false, // Don't interfere with provisioning
            _ => true,
        };

        if should_update {
            info!(
                ctid = container.proxmox_ctid,
                old_state = ?container.state,
                new_state = ?new_state,
                "state sync: updating container state"
            );
            if let Err(e) = containers.update_state(container.id, new_state).await {
                error!(
                    ctid = container.proxmox_ctid,
                    error = %e.message,
                    "state sync: failed to update DB state"
                );
            }
        }
    }
}
