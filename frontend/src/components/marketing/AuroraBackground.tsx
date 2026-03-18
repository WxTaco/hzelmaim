/**
 * AuroraBackground
 *
 * Renders a static, very faint gradient wash at the top of a section.
 * No animation — the gradient is purely for depth, not decoration.
 *
 * @example
 * <AuroraBackground>
 *   <HeroCanvas />
 * </AuroraBackground>
 */

import { ReactNode } from 'react';

interface AuroraBackgroundProps {
  children: ReactNode;
  className?: string;
}

export function AuroraBackground({ children, className = '' }: AuroraBackgroundProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Faint top gradient — provides depth without being visible as a shape */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-blue-950/25 via-blue-950/5 to-transparent"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

