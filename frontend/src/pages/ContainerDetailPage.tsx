/**
 * Container detail page with lifecycle actions, metrics, and configuration.
 * Displays container status, allows start/stop/restart operations, and shows live metrics.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { get, post } from '../api/client';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { ContainerRecord, ContainerMetrics } from '../types/api';

/**
 * Container detail page component.
 * Fetches container data and metrics, provides lifecycle action buttons.
 */
export function ContainerDetailPage(): React.ReactElement {
  const { containerId } = useParams<{ containerId: string }>();
  const navigate = useNavigate();
  const [container, setContainer] = useState<ContainerRecord | null>(null);
  const [metrics, setMetrics] = useState<ContainerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerId) return;
    loadContainer();
  }, [containerId]);

  const loadContainer = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await get<ContainerRecord>(`/api/v1/containers/${containerId}`);
      setContainer(data);
      await loadMetrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load container');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const data = await get<ContainerMetrics>(`/api/v1/containers/${containerId}/metrics`);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  };

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!containerId) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await post(`/api/v1/containers/${containerId}/${action}`);
      await loadContainer();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${action} container`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-vercel-muted">Loading container…</p>
      </div>
    );
  }

  if (error || !container) {
    return (
      <Card title="Error" subtitle="Failed to load container">
        <p className="text-sm text-rose-300">{error || 'Container not found'}</p>
        <button
          onClick={() => navigate('/containers')}
          className="mt-4 rounded-lg border border-vercel-border bg-vercel-surface px-4 py-2 text-sm font-medium text-vercel-text transition-all duration-200 hover:border-vercel-accent hover:bg-vercel-card"
        >
          Back to containers
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with container name and status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-vercel-text">{container.name}</h2>
          <p className="mt-2 text-sm text-vercel-muted">ID: {container.id}</p>
        </div>
        <StatusBadge status={container.state} />
      </div>

      {actionError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{actionError}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lifecycle Actions */}
        <Card title="Lifecycle Actions" subtitle="Start, stop, and restart operations.">
          <div className="space-y-3">
            <Link
              to={`/containers/${containerId}/terminal`}
              aria-disabled={container.state !== 'running'}
              tabIndex={container.state !== 'running' ? -1 : undefined}
              className={`block w-full rounded-lg border border-vercel-accent/40 px-4 py-2.5 text-center text-sm font-semibold text-vercel-accent transition-all duration-200 hover:border-vercel-accent hover:bg-vercel-accent/10 ${container.state !== 'running' ? 'pointer-events-none opacity-40' : ''}`}
            >
              Open Terminal
            </Link>
            <button
              onClick={() => handleAction('start')}
              disabled={actionLoading || container.state === 'running'}
              className="w-full rounded-lg bg-vercel-accent px-4 py-2.5 text-sm font-semibold text-vercel-bg transition-all duration-200 disabled:opacity-50 hover:bg-emerald-600 hover:shadow-vercel-md"
            >
              {actionLoading ? 'Processing…' : 'Start'}
            </button>
            <button
              onClick={() => handleAction('stop')}
              disabled={actionLoading || container.state === 'stopped'}
              className="w-full rounded-lg border border-vercel-border bg-vercel-surface px-4 py-2.5 text-sm font-semibold text-vercel-text transition-all duration-200 disabled:opacity-50 hover:border-amber-500/50 hover:bg-vercel-card hover:text-amber-400"
            >
              {actionLoading ? 'Processing…' : 'Stop'}
            </button>
            <button
              onClick={() => handleAction('restart')}
              disabled={actionLoading || container.state !== 'running'}
              className="w-full rounded-lg border border-vercel-border bg-vercel-surface px-4 py-2.5 text-sm font-semibold text-vercel-text transition-all duration-200 disabled:opacity-50 hover:border-blue-500/50 hover:bg-vercel-card hover:text-blue-400"
            >
              {actionLoading ? 'Processing…' : 'Restart'}
            </button>
          </div>
        </Card>

        {/* Container Info */}
        <Card title="Configuration" subtitle="Container details and resource allocation.">
          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-vercel-muted">Proxmox CTID</dt>
              <dd className="font-mono text-vercel-text">{container.proxmox_ctid}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-vercel-muted">Node</dt>
              <dd className="text-vercel-text">{container.node_name}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-vercel-muted">Created</dt>
              <dd className="text-vercel-text">{new Date(container.created_at).toLocaleDateString()}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-vercel-muted">State</dt>
              <dd className="capitalize text-vercel-text">{container.state}</dd>
            </div>
          </dl>
        </Card>

        {/* Metrics */}
        {metrics && (
          <Card title="Metrics" subtitle="Real-time resource usage.">
            <dl className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-vercel-muted">CPU Usage</dt>
                <dd className="font-mono text-vercel-text">{metrics.cpu_percent.toFixed(1)}%</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-vercel-muted">Memory</dt>
                <dd className="font-mono text-vercel-text">
                  {metrics.memory_used_mb} / {metrics.memory_limit_mb} MB
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-vercel-muted">Network RX</dt>
                <dd className="font-mono text-vercel-text">{(metrics.network_rx_bytes / 1024 / 1024).toFixed(2)} MB</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-vercel-muted">Network TX</dt>
                <dd className="font-mono text-vercel-text">{(metrics.network_tx_bytes / 1024 / 1024).toFixed(2)} MB</dd>
              </div>
            </dl>
          </Card>
        )}

        {/* Tunnel Info */}
        <Card title="Cloudflare Tunnel" subtitle="Future SSH exposure and session policy.">
          <p className="text-sm text-vercel-muted">Tunnel provisioning and access policies will be represented here.</p>
        </Card>
      </div>
    </div>
  );

}