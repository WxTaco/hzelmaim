/**
 * Dashboard overview for containers, jobs, and system health.
 */

import { Card } from '../components/ui/Card';

export function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card title="Containers" subtitle="Tenant-scoped inventory and lifecycle status."><p className="text-sm text-slate-300">0 running, 0 stopped, 0 provisioning.</p></Card>
      <Card title="Command Queue" subtitle="Asynchronous execution and streaming state."><p className="text-sm text-slate-300">No jobs have been submitted in this scaffold.</p></Card>
      <Card title="Security" subtitle="Authentication, sessions, and audit posture."><p className="text-sm text-slate-300">Secure cookies, CSRF enforcement, and OIDC are designed into the backend contracts.</p></Card>
    </div>
  );
}
