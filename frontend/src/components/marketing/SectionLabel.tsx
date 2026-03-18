/**
 * SectionLabel
 *
 * Monospaced uppercase eyebrow label for landing page sections.
 * Intentionally plain — no pill, no dot, no animation.
 *
 * @example
 * <SectionLabel>Built Around Use</SectionLabel>
 */

import { ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p className="font-mono text-xs font-medium uppercase tracking-widest text-slate-500">
      {children}
    </p>
  );
}

