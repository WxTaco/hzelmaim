/**
 * Container inventory and management page.
 * Displays all containers accessible to the authenticated user with live API data.
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
    // Reload containers list
    get<ContainerSummary[]>('/api/v1/containers')
      .then(setContainers)
      .catch(console.error);
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Containers</h2>
          <p className="text-sm text-slate-400">Create, inspect, and operate on LXC containers.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          + Create Container
        </button>
      </div>

      <Card title="" subtitle="">
        {loading && (
          <p className="py-6 text-center text-sm text-slate-600">Loading containers…</p>
        )}
        {error && (
          <p className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>
        )}
        {!loading && !error && containers.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-600">No containers yet. Create one to get started.</p>
        )}
        {!loading && !error && containers.length > 0 && (
          <div className="space-y-3">
            {containers.map((container) => (
              <div
                key={container.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 p-3 transition hover:border-slate-700 hover:bg-slate-900/30"
              >
                <div>
                  <p className="font-medium text-white">{container.name}</p>
                  <p className="text-sm text-slate-400">Node {container.node_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={container.state} />
                  <Link
                    className="text-sm text-emerald-300 transition hover:text-emerald-200"
                    to={`/containers/${container.id}`}
                  >
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showCreateModal && (
        <CreateContainerModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </>
  );
}
