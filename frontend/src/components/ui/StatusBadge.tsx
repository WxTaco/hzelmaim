/**
 * Compact status indicator badge for container and job states.
 * Displays status with color-coded background and text.
 */

/**
 * Props for the StatusBadge component.
 */
interface StatusBadgeProps {
  /** Status value to display */
  status: 'provisioning' | 'running' | 'stopped' | 'failed' | 'queued' | 'succeeded';
}

/**
 * Tailwind class mappings for each status state.
 * Provides color-coded styling for visual status indication.
 */
const statusClassMap: Record<StatusBadgeProps['status'], string> = {
  provisioning: 'bg-amber-500/20 text-amber-300',
  running: 'bg-emerald-500/20 text-emerald-300',
  stopped: 'bg-slate-600/30 text-slate-200',
  failed: 'bg-rose-500/20 text-rose-300',
  queued: 'bg-sky-500/20 text-sky-300',
  succeeded: 'bg-emerald-500/20 text-emerald-300',
};

/**
 * Status badge component.
 * Renders a small, color-coded badge indicating the current status.
 */
export function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClassMap[status]}`}>
      {status}
    </span>
  );
}
