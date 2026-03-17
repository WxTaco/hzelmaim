/**
 * Container detail placeholder for lifecycle, files, metrics, and SSH tunnel status.
 */

import { Card } from '../components/ui/Card';

export function ContainerDetailPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Lifecycle Actions" subtitle="Start, stop, restart, snapshot, and delete operations."><p className="text-sm text-slate-300">Actions will call permission-checked backend routes instead of exposing raw Proxmox APIs.</p></Card>
      <Card title="Cloudflare Tunnel" subtitle="Future SSH exposure and session policy."><p className="text-sm text-slate-300">Tunnel provisioning and access policies will be represented here.</p></Card>
      <Card title="Metrics" subtitle="CPU, memory, network, and runtime status."><p className="text-sm text-slate-300">Charts and real-time polling will be added after the metrics API is implemented.</p></Card>
      <Card title="Files" subtitle="Safe file editing inside container root only."><p className="text-sm text-slate-300">Future endpoints must deny path traversal and out-of-root access.</p></Card>
    </div>
  );
}
