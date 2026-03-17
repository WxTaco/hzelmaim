/**
 * Command execution page placeholder.
 */

import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';

export function CommandsPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card title="Run Command" subtitle="Commands are tokenized, queued, audited, and streamed.">
        <div className="space-y-3 text-sm text-slate-300">
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Program, e.g. systemctl" />
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Arguments, e.g. status nginx" />
          <button className="rounded-lg bg-accent px-4 py-2 font-medium text-slate-950">Queue command</button>
        </div>
      </Card>
      <Card title="Recent Jobs" subtitle="WebSocket-driven output will appear here.">
        <div className="flex items-center justify-between rounded-lg border border-slate-800 p-3">
          <div>
            <p className="font-medium text-white">systemctl status nginx</p>
            <p className="text-sm text-slate-400">container: demo-container</p>
          </div>
          <StatusBadge status="queued" />
        </div>
      </Card>
    </div>
  );
}
