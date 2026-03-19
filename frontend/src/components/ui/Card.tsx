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
  title?: string;
  /** Optional subtitle displayed below the title */
  subtitle?: string;
  /** Card content */
  children: ReactNode;
  /** Optional CSS class for additional styling */
  className?: string;
}

/**
 * Card component for displaying grouped content.
 * Implements Vercel-inspired design with subtle borders, minimal shadows, and smooth transitions.
 * Renders a styled panel with optional title, subtitle, and flexible content area.
 */
export function Card({ title, subtitle, children, className = '' }: CardProps): React.ReactElement {
  return (
    <section className={`rounded-lg border border-vercel-border bg-vercel-card p-6 transition-all duration-200 hover:border-vercel-border/80 hover:shadow-vercel-md ${className}`}>
      {/* Card header with title and optional subtitle */}
      {title && (
        <header className="mb-6">
          <h2 className="text-sm font-semibold text-vercel-text">{title}</h2>
          {subtitle && <p className="mt-2 text-xs text-vercel-muted">{subtitle}</p>}
        </header>
      )}
      {/* Card content area */}
      {children}
    </section>
  );
}
