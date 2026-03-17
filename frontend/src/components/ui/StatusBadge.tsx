/**
 * Compact status indicator for container and job states.
 */

interface StatusBadgeProps {
  status: 'provisioning' | 'running' | 'stopped' | 'failed' | 'queued' | 'succeeded';
}

const statusClass: Record<StatusBadgeProps['status'], string> = {
  provisioning: 'bg-amber-500/20 text-amber-300',
  running: 'bg-emerald-500/20 text-emerald-300',
  stopped: 'bg-slate-600/30 text-slate-200',
  failed: 'bg-rose-500/20 text-rose-300',
  queued: 'bg-sky-500/20 text-sky-300',
  succeeded: 'bg-emerald-500/20 text-emerald-300',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass[status]}`}>{status}</span>;
}
