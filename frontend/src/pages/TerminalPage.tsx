/**
 * Terminal placeholder for future xterm.js integration.
 */

import { Card } from '../components/ui/Card';

export function TerminalPage() {
  return (
    <Card title="Web Terminal" subtitle="Reserved for xterm.js and WebSocket-backed terminal sessions.">
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-6 text-sm text-slate-400">
        Terminal streaming is not implemented yet. The backend route contract exists at <code>/ws/terminal/:containerId</code>.
      </div>
    </Card>
  );
}
