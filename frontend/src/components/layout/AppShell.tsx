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
    <div className="flex min-h-screen bg-vercel-bg text-vercel-text">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Sticky header with page title and user controls */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-vercel-border bg-vercel-bg/95 px-8 py-4 backdrop-blur-sm transition-all duration-200">
          <h1 className="text-base font-semibold text-vercel-text">{title}</h1>
          <div className="flex items-center gap-6">
            {user && (
              <span className="text-sm text-vercel-muted">{user.email}</span>
            )}
            <button
              onClick={logout}
              className="rounded-md border border-vercel-border bg-vercel-surface px-4 py-2 text-sm font-medium text-vercel-text transition-all duration-200 hover:border-vercel-accent hover:bg-vercel-card hover:text-vercel-accent"
            >
              Sign out
            </button>
          </div>
        </header>
        {/* Main content area */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
