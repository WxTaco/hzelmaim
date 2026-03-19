/**
 * Modal for creating a new LXC container.
 * Collects hostname, CPU cores, memory, and disk size inputs.
 */

import { useState } from 'react';
import { post } from '../../api/client';
import type { CreateContainerResult } from '../../types/api';

/**
 * Props for the CreateContainerModal component.
 */
interface CreateContainerModalProps {
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when container is successfully created */
  onSuccess: (result: CreateContainerResult) => void;
}

/**
 * Modal component for creating a new container.
 * Displays form with hostname, CPU, memory, and disk inputs.
 * Shows initial password on successful creation.
 */
export function CreateContainerModal({ onClose, onSuccess }: CreateContainerModalProps): React.ReactElement {
  const [hostname, setHostname] = useState('');
  const [cpuCores, setCpuCores] = useState('1');
  const [memoryMb, setMemoryMb] = useState('512');
  const [diskGb, setDiskGb] = useState('8');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'cloning' | 'configuring' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateContainerResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostname.trim()) {
      setError('Hostname is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPhase('cloning');
      // After a short delay switch label to reflect disk-lock wait phase.
      const phaseTimer = setTimeout(() => setPhase('configuring'), 8000);
      const data = await post<CreateContainerResult>('/api/v1/containers', {
        hostname: hostname.trim(),
        cpu_cores: parseInt(cpuCores) || 1,
        memory_mb: parseInt(memoryMb) || 512,
        disk_gb: parseInt(diskGb) || 8,
      });
      clearTimeout(phaseTimer);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create container');
    } finally {
      setLoading(false);
      setPhase(null);
    }
  };

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
        <div className="w-full max-w-md rounded-lg border border-vercel-border bg-vercel-card p-6">
          <h2 className="text-lg font-bold text-vercel-text">Container Created</h2>
          <p className="mt-2 text-sm text-vercel-muted">Your container has been created successfully.</p>

          <div className="mt-6 space-y-4 rounded-lg border border-vercel-border bg-vercel-surface p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-vercel-muted">Container Name</p>
              <p className="mt-2 font-mono text-sm text-vercel-text">{result.name}</p>
            </div>
            {result.initial_password && (
              <div className="border-t border-vercel-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-vercel-muted">Initial Root Password</p>
                <p className="mt-2 font-mono text-sm text-vercel-accent">{result.initial_password}</p>
                <p className="mt-3 text-xs text-vercel-muted">Save this password securely. It will not be shown again.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              onSuccess(result);
              onClose();
            }}
            className="mt-6 w-full rounded-lg bg-vercel-accent px-4 py-2.5 text-sm font-semibold text-vercel-bg transition-all duration-200 hover:bg-emerald-600 hover:shadow-vercel-md"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-lg border border-vercel-border bg-vercel-card p-6">
        <h2 className="text-lg font-bold text-vercel-text">Create Container</h2>
        <p className="mt-2 text-sm text-vercel-muted">Configure a new LXC container.</p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-vercel-text">Hostname</label>
            <input
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="e.g., web-server-01"
              className="mt-2 w-full rounded-lg border border-vercel-border bg-vercel-surface px-3 py-2 text-sm text-vercel-text placeholder-vercel-muted focus:border-vercel-accent focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-vercel-text">CPU Cores</label>
              <input
                type="number"
                min="1"
                max="16"
                value={cpuCores}
                onChange={(e) => setCpuCores(e.target.value)}
                className="mt-2 w-full rounded-lg border border-vercel-border bg-vercel-surface px-3 py-2 text-sm text-vercel-text focus:border-vercel-accent focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-vercel-text">Memory (MB)</label>
              <input
                type="number"
                min="256"
                max="65536"
                step="256"
                value={memoryMb}
                onChange={(e) => setMemoryMb(e.target.value)}
                className="mt-2 w-full rounded-lg border border-vercel-border bg-vercel-surface px-3 py-2 text-sm text-vercel-text focus:border-vercel-accent focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-vercel-text">Disk (GB)</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={diskGb}
                onChange={(e) => setDiskGb(e.target.value)}
                className="mt-2 w-full rounded-lg border border-vercel-border bg-vercel-surface px-3 py-2 text-sm text-vercel-text focus:border-vercel-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-vercel-border bg-vercel-surface px-4 py-2.5 text-sm font-semibold text-vercel-text transition-all duration-200 hover:border-vercel-accent hover:bg-vercel-card"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-vercel-accent px-4 py-2.5 text-sm font-semibold text-vercel-bg transition-all duration-200 disabled:opacity-50 hover:bg-emerald-600 hover:shadow-vercel-md"
            >
              {loading
                ? phase === 'configuring'
                  ? 'Waiting for disk unlock…'
                  : 'Cloning template…'
                : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

