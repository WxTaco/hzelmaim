/**
 * Dashboard overview page with Vercel-inspired metric cards and live API data.
 * Displays container inventory, system health, and recent activity.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { ContainerSummary } from '../types/api';

/**
 * Props for the Metric component.
 */
interface MetricProps {
  /** The metric label (e.g., "Total Containers") */
  label: string;
  /** The metric value to display */
  value: ReactNode;
  /** Optional subtitle or secondary text */
  sub?: string;
  /** Optional link destination; makes the card clickable */
  href?: string;
}

/**
 * Metric card component displaying a single KPI.
 * Renders as a clickable link if href is provided.
 */
function Metric({ label, value, sub, href }: MetricProps): React.ReactElement {
  const inner = (
    <div className="group relative rounded-xl border border-slate-800 bg-panel p-5 transition hover:border-slate-700 hover:shadow-md hover:shadow-slate-900/50">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{value}</p>
      {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
      {href && (
        <span className="absolute right-4 top-5 text-slate-600 transition group-hover:text-slate-400">→</span>
      )}
    </div>
  );
  return href ? <Link to={href} className="block">{inner}</Link> : inner;
}

/**
 * Props for the ActivityRow component.
 */
interface ActivityRowProps {
  /** Container or resource name */
  name: string;
  /** Current state (running, stopped, provisioning, failed) */
  state: string;
  /** Timestamp or date string */
  time: string;
}

/**
 * Activity row component displaying a single container or resource entry.
 * Shows status indicator, name, and timestamp.
 */
function ActivityRow({ name, state, time }: ActivityRowProps): React.ReactElement {
  const stateColorMap: Record<string, string> = {
    running: 'bg-emerald-400',
    stopped: 'bg-slate-500',
    provisioning: 'bg-amber-400',
    failed: 'bg-rose-400',
  };

  const dotColor = stateColorMap[state] ?? 'bg-slate-600';

  return (
    <div className="flex items-center gap-3 border-b border-slate-800/60 py-3 last:border-0 transition hover:bg-slate-900/30">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      <span className="flex-1 truncate text-sm text-slate-200">{name}</span>
      <span className="text-xs text-slate-500">{time}</span>
    </div>
  );
}

/**
 * Main dashboard page component.
 * Displays system metrics, container inventory, and recent activity.
 * Fetches live container data from the API and renders Vercel-inspired metric cards.
 */
export function DashboardPage(): React.ReactElement {
  const { user } = useAuth();
  const [containers, setContainers] = useState<ContainerSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<ContainerSummary[]>('/api/v1/containers')
      .then(setContainers)
      .catch(() => setContainers([]))
      .finally(() => setLoading(false));
  }, []);

  const running = containers.filter(c => c.state === 'running').length;
  const stopped = containers.filter(c => c.state === 'stopped').length;
  const provisioning = containers.filter(c => c.state === 'provisioning').length;
  const failed = containers.filter(c => c.state === 'failed').length;

  const greeting = user?.email?.split('@')[0] ?? 'operator';

  return (
    <div className="space-y-8">
      {/* Page header with personalized greeting */}
      <div>
        <h2 className="text-lg font-medium text-white">
          Welcome back, <span className="text-slate-400">{greeting}</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">Here's what's happening across your infrastructure.</p>
      </div>

      {/* Top-level KPI metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Total Containers"
          value={loading ? '—' : containers.length}
          href="/containers"
        />
        <Metric
          label="Running"
          value={loading ? '—' : running}
          sub={containers.length ? `${Math.round((running / containers.length) * 100)}% of fleet` : undefined}
        />
        <Metric label="Stopped" value={loading ? '—' : stopped} />
        <Metric
          label="Issues"
          value={loading ? '—' : failed + provisioning}
          sub={failed ? `${failed} failed` : undefined}
        />
      </div>

      {/* Bottom section: recent activity and system info */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent containers activity list */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">Recent Containers</h3>
            <Link
              to="/containers"
              className="text-xs text-slate-500 transition hover:text-slate-300"
            >
              View all →
            </Link>
          </div>
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-600">Loading…</p>
          ) : containers.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-600">
              No containers yet. Create one to get started.
            </p>
          ) : (
            <div>
              {containers.slice(0, 6).map(c => (
                <ActivityRow
                  key={c.id}
                  name={c.name}
                  state={c.state}
                  time={new Date(c.created_at).toLocaleDateString()}
                />
              ))}
            </div>
          )}
        </div>

        {/* System information sidebar */}
        <div className="rounded-xl border border-slate-800 bg-panel p-5">
          <h3 className="mb-4 text-sm font-medium text-slate-300">System</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Auth</dt>
              <dd className="font-medium text-emerald-400">OIDC</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">User</dt>
              <dd className="truncate max-w-[160px] text-slate-200">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Role</dt>
              <dd className="text-slate-200 capitalize">{user?.role ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Fleet size</dt>
              <dd className="tabular-nums text-slate-200">{loading ? '—' : containers.length}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
