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
      const data = await post<CreateContainerResult>('/api/v1/containers', {
        hostname: hostname.trim(),
        cpu_cores: parseInt(cpuCores) || 1,
        memory_mb: parseInt(memoryMb) || 512,
        disk_gb: parseInt(diskGb) || 8,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create container');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-lg font-bold text-white">Container Created</h2>
          <p className="mt-2 text-sm text-slate-400">Your container has been created successfully.</p>
          
          <div className="mt-4 space-y-3 rounded-lg bg-slate-900 p-4">
            <div>
              <p className="text-xs text-slate-500">Container Name</p>
              <p className="font-mono text-sm text-slate-200">{result.name}</p>
            </div>
            {result.initial_password && (
              <div>
                <p className="text-xs text-slate-500">Initial Root Password</p>
                <p className="font-mono text-sm text-emerald-300">{result.initial_password}</p>
                <p className="mt-1 text-xs text-slate-500">Save this password securely. It will not be shown again.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              onSuccess(result);
              onClose();
            }}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6">
        <h2 className="text-lg font-bold text-white">Create Container</h2>
        <p className="mt-1 text-sm text-slate-400">Configure a new LXC container.</p>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Hostname</label>
            <input
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="e.g., web-server-01"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300">CPU Cores</label>
              <input
                type="number"
                min="1"
                max="16"
                value={cpuCores}
                onChange={(e) => setCpuCores(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Memory (MB)</label>
              <input
                type="number"
                min="256"
                max="65536"
                step="256"
                value={memoryMb}
                onChange={(e) => setMemoryMb(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Disk (GB)</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={diskGb}
                onChange={(e) => setDiskGb(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 hover:bg-emerald-700"
            >
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

