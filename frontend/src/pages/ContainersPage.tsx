/**
 * Container inventory and management page with Vercel-inspired design.
 * Displays all containers with live API data and create functionality.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api/client';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CreateContainerModal } from '../components/modals/CreateContainerModal';
import type { ContainerSummary, CreateContainerResult } from '../types/api';

/**
 * Container inventory page component.
 * Fetches and displays all containers with links to detail pages.
 */
export function ContainersPage(): React.ReactElement {
  const [containers, setContainers] = useState<ContainerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    get<ContainerSummary[]>('/api/v1/containers')
      .then(setContainers)
      .catch((err) => {
        setError(err.message || 'Failed to load containers');
        setContainers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateSuccess = (result: CreateContainerResult) => {
    setShowCreateModal(false);
    get<ContainerSummary[]>('/api/v1/containers')
      .then(setContainers)
      .catch(console.error);
  };

  return (
    <div className="space-y-6">
      {/* Page header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-vercel-text">Containers</h2>
          <p className="mt-2 text-sm text-vercel-muted">Create, inspect, and operate on LXC containers.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-vercel-accent px-6 py-2.5 text-sm font-semibold text-vercel-bg transition-all duration-200 hover:bg-emerald-600 hover:shadow-vercel-md"
        >
          + Create Container
        </button>
      </div>

      {/* Container list card */}
      <Card>
        {loading && (
          <p className="py-12 text-center text-sm text-vercel-muted">Loading containers…</p>
        )}
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            {error}
          </div>
        )}
        {!loading && !error && containers.length === 0 && (
          <p className="py-12 text-center text-sm text-vercel-muted">
            No containers yet. <button onClick={() => setShowCreateModal(true)} className="text-vercel-accent hover:underline">Create one</button> to get started.
          </p>
        )}
        {!loading && !error && containers.length > 0 && (
          <div className="space-y-2">
            {containers.map((container) => (
              <Link
                key={container.id}
                to={`/containers/${container.id}`}
                className="flex items-center justify-between rounded-lg border border-vercel-border bg-vercel-surface p-4 transition-all duration-200 hover:border-vercel-accent/50 hover:bg-vercel-card hover:shadow-vercel-md"
              >
                <div className="flex-1">
                  <p className="font-medium text-vercel-text">{container.name}</p>
                  <p className="mt-1 text-xs text-vercel-muted">Node {container.node_name}</p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={container.state} />
                  <span className="text-vercel-muted transition-colors group-hover:text-vercel-accent">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Create container modal */}
      {showCreateModal && (
        <CreateContainerModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
