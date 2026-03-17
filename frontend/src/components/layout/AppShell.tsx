/**
 * Shared shell layout for authenticated application pages.
 */

import { ReactNode } from 'react';
import { Sidebar } from '../navigation/Sidebar';

interface AppShellProps {
  title: string;
  children: ReactNode;
}

export function AppShell({ title, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-shell text-slate-100">
      <Sidebar />
      <main className="flex-1 p-6">
        <header className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-slate-400">Private multi-tenant container control plane foundation.</p>
          </div>
          <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm text-emerald-300">OIDC-ready</div>
        </header>
        {children}
      </main>
    </div>
  );
}
