/**
 * GlowPanel
 *
 * Clean bordered card used throughout the landing page.
 * Hover brightens the border only — no glow, no lift, no animation.
 * The `accent` prop is retained for call-site compatibility but
 * no longer drives a visible colour difference.
 *
 * @example
 * <GlowPanel>
 *   <h3>Lifecycle Control</h3>
 *   <p>...</p>
 * </GlowPanel>
 */

import { ReactNode } from 'react';

export type GlowAccent = 'cyan' | 'blue' | 'violet' | 'emerald';

interface GlowPanelProps {
  children: ReactNode;
  /** Retained for API compatibility — no longer applies a colour tint. */
  accent?: GlowAccent;
  className?: string;
}

export function GlowPanel({ children, className = '' }: GlowPanelProps) {
  return (
    <div
      className={[
        'rounded-lg border border-m-border bg-m-panel p-5',
        'transition-colors duration-200 hover:border-slate-600 hover:bg-slate-800/40',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

