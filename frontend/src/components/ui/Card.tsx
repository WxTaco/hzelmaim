/**
 * Reusable panel component for dashboards and detail pages.
 */

import { ReactNode } from 'react';

interface CardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Card({ title, subtitle, children }: CardProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-panel p-5 shadow-lg shadow-black/20">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-400">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
