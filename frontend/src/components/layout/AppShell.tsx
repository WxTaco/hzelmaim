/**
 * Shared shell layout for authenticated application pages.
 * Provides sidebar navigation, sticky header with user info, and main content area.
 */

import { ReactNode } from 'react';
import { Sidebar } from '../navigation/Sidebar';
import { useAuth } from '../../auth/AuthContext';

/**
 * Props for the AppShell component.
 */
interface AppShellProps {
  /** Page title displayed in the header */
  title: string;
  /** Page content to render in the main area */
  children: ReactNode;
}

/**
 * Main application shell component.
 * Wraps authenticated pages with navigation sidebar, sticky header, and content area.
 * Displays current user email and provides sign-out functionality.
 */
export function AppShell({ title, children }: AppShellProps): React.ReactElement {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-shell text-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Sticky header with page title and user controls */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-shell/80 px-6 py-3 backdrop-blur">
          <h1 className="text-sm font-medium text-white">{title}</h1>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-xs text-slate-500">{user.email}</span>
            )}
            <button
              onClick={logout}
              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
            >
              Sign out
            </button>
          </div>
        </header>
        {/* Main content area */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
