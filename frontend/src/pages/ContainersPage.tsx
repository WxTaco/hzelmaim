/**
 * Container inventory and management page.
 */

import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';

const sampleContainers = [{ id: 'demo-container', name: 'example-container', node: 'pve-1', state: 'running' as const }];

export function ContainersPage() {
  return (
    <Card title="Containers" subtitle="Create, inspect, and operate on LXC containers.">
      <div className="space-y-3">
        {sampleContainers.map((container) => (
          <div key={container.id} className="flex items-center justify-between rounded-lg border border-slate-800 p-3">
            <div>
              <p className="font-medium text-white">{container.name}</p>
              <p className="text-sm text-slate-400">Node {container.node}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={container.state} />
              <Link className="text-sm text-emerald-300" to={`/containers/${container.id}`}>Open</Link>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
