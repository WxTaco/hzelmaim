/**
 * Reusable card/panel component for dashboards and detail pages.
 * Provides consistent styling with title, optional subtitle, and flexible content area.
 */

import { ReactNode } from 'react';

/**
 * Props for the Card component.
 */
interface CardProps {
  /** Card title */
  title: string;
  /** Optional subtitle displayed below the title */
  subtitle?: string;
  /** Card content */
  children: ReactNode;
}

/**
 * Card component for displaying grouped content.
 * Renders a styled panel with title, optional subtitle, and flexible content area.
 */
export function Card({ title, subtitle, children }: CardProps): React.ReactElement {
  return (
    <section className="rounded-xl border border-slate-800 bg-panel p-5 shadow-lg shadow-black/20">
      {/* Card header with title and optional subtitle */}
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </header>
      {/* Card content area */}
      {children}
    </section>
  );
}
