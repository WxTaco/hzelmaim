/**
 * Container detail page with lifecycle actions, metrics, and configuration.
 * Displays container status, allows start/stop/restart operations, and shows live metrics.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
        <p className="text-slate-400">Loading container…</p>
      </div>
    );
  }

  if (error || !container) {
    return (
      <Card title="Error" subtitle="Failed to load container">
        <p className="text-sm text-rose-300">{error || 'Container not found'}</p>
        <button
          onClick={() => navigate('/containers')}
          className="mt-4 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to containers
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with container name and status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{container.name}</h2>
          <p className="mt-1 text-sm text-slate-400">ID: {container.id}</p>
        </div>
        <StatusBadge status={container.state} />
      </div>

      {actionError && (
        <div className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">{actionError}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Lifecycle Actions */}
        <Card title="Lifecycle Actions" subtitle="Start, stop, and restart operations.">
          <div className="space-y-2">
            <button
              onClick={() => handleAction('start')}
              disabled={actionLoading || container.state === 'running'}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 hover:bg-emerald-700"
            >
              {actionLoading ? 'Processing…' : 'Start'}
            </button>
            <button
              onClick={() => handleAction('stop')}
              disabled={actionLoading || container.state === 'stopped'}
              className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 hover:bg-amber-700"
            >
              {actionLoading ? 'Processing…' : 'Stop'}
            </button>
            <button
              onClick={() => handleAction('restart')}
              disabled={actionLoading || container.state !== 'running'}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 hover:bg-blue-700"
            >
              {actionLoading ? 'Processing…' : 'Restart'}
            </button>
          </div>
        </Card>

        {/* Container Info */}
        <Card title="Configuration" subtitle="Container details and resource allocation.">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Proxmox CTID</dt>
              <dd className="font-mono text-slate-200">{container.proxmox_ctid}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Node</dt>
              <dd className="text-slate-200">{container.node_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Created</dt>
              <dd className="text-slate-200">{new Date(container.created_at).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">State</dt>
              <dd className="capitalize text-slate-200">{container.state}</dd>
            </div>
          </dl>
        </Card>

        {/* Metrics */}
        {metrics && (
          <Card title="Metrics" subtitle="Real-time resource usage.">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">CPU Usage</dt>
                <dd className="font-mono text-slate-200">{metrics.cpu_percent.toFixed(1)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Memory</dt>
                <dd className="font-mono text-slate-200">
                  {metrics.memory_used_mb} / {metrics.memory_limit_mb} MB
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Network RX</dt>
                <dd className="font-mono text-slate-200">{(metrics.network_rx_bytes / 1024 / 1024).toFixed(2)} MB</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Network TX</dt>
                <dd className="font-mono text-slate-200">{(metrics.network_tx_bytes / 1024 / 1024).toFixed(2)} MB</dd>
              </div>
            </dl>
          </Card>
        )}

        {/* Tunnel Info */}
        <Card title="Cloudflare Tunnel" subtitle="Future SSH exposure and session policy.">
          <p className="text-sm text-slate-300">Tunnel provisioning and access policies will be represented here.</p>
        </Card>
      </div>
    </div>
  );

}