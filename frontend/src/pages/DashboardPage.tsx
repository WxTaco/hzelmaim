/**
 * Main dashboard page with Vercel-inspired design.
 * Displays KPI metrics, container inventory, and system status with live API data.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { ContainerSummary } from '../types/api';

/**
 * Props for the MetricCard component.
 */
interface MetricCardProps {
  /** Metric label */
  label: string;
  /** Metric value to display */
  value: ReactNode;
  /** Optional secondary text */
  sub?: string;
  /** Optional link destination */
  href?: string;
}

/**
 * Metric card component displaying a single KPI.
 * Renders as a clickable link if href is provided.
 */
function MetricCard({ label, value, sub, href }: MetricCardProps): React.ReactElement {
  const inner = (
    <div className="group relative rounded-lg border border-vercel-border bg-vercel-card p-6 transition-all duration-200 hover:border-vercel-accent/50 hover:shadow-vercel-md">
      <p className="text-xs font-semibold uppercase tracking-wider text-vercel-muted">{label}</p>
      <p className="mt-3 text-3xl font-bold tabular-nums text-vercel-text">{value}</p>
      {sub && <p className="mt-2 text-sm text-vercel-muted">{sub}</p>}
      {href && (
        <span className="absolute right-6 top-6 text-vercel-muted transition-colors group-hover:text-vercel-accent">→</span>
      )}
    </div>
  );
  return href ? <Link to={href} className="block">{inner}</Link> : inner;
}

/**
 * Props for the ActivityRow component.
 */
interface ActivityRowProps {
  /** Container name */
  name: string;
  /** Container state */
  state: string;
  /** Creation date */
  time: string;
}

/**
 * Activity row component displaying a container entry.
 */
function ActivityRow({ name, state, time }: ActivityRowProps): React.ReactElement {
  const stateColorMap: Record<string, string> = {
    running: 'bg-emerald-500',
    stopped: 'bg-slate-500',
    provisioning: 'bg-amber-500',
    failed: 'bg-rose-500',
  };

  const dotColor = stateColorMap[state] ?? 'bg-slate-600';

  return (
    <div className="flex items-center gap-4 border-b border-vercel-border/50 py-3 last:border-0 transition-colors hover:bg-vercel-surface/30">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      <span className="flex-1 truncate text-sm text-vercel-text">{name}</span>
      <span className="text-xs text-vercel-muted">{time}</span>
    </div>
  );
}

/**
 * Main dashboard page component.
 * Displays system metrics, container inventory, and recent activity.
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
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-vercel-text">
          Welcome back, <span className="text-vercel-muted">{greeting}</span>
        </h2>
        <p className="mt-2 text-sm text-vercel-muted">Monitor and manage your container infrastructure.</p>
      </div>

      {/* KPI metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Containers"
          value={loading ? '—' : containers.length}
          href="/containers"
        />
        <MetricCard
          label="Running"
          value={loading ? '—' : running}
          sub={containers.length ? `${Math.round((running / containers.length) * 100)}% of fleet` : undefined}
        />
        <MetricCard label="Stopped" value={loading ? '—' : stopped} />
        <MetricCard
          label="Issues"
          value={loading ? '—' : failed + provisioning}
          sub={failed ? `${failed} failed` : undefined}
        />
      </div>

      {/* Bottom section: activity and system info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent containers */}
        <Card title="Recent Containers" subtitle="Latest activity" className="lg:col-span-2">
          {loading ? (
            <p className="py-8 text-center text-sm text-vercel-muted">Loading…</p>
          ) : containers.length === 0 ? (
            <p className="py-8 text-center text-sm text-vercel-muted">
              No containers yet. <Link to="/containers" className="text-vercel-accent hover:underline">Create one</Link> to get started.
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
        </Card>

        {/* System info */}
        <Card title="System" subtitle="Infrastructure details">
          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-vercel-muted">Auth</dt>
              <dd className="font-medium text-vercel-accent">OIDC</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-vercel-muted">User</dt>
              <dd className="truncate max-w-[160px] text-vercel-text">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-vercel-muted">Role</dt>
              <dd className="text-vercel-text capitalize">{user?.role ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-vercel-muted">Fleet size</dt>
              <dd className="tabular-nums text-vercel-text">{loading ? '—' : containers.length}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
