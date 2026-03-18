/**
 * GradientText
 *
 * Renders an inline `<span>` with the brand gradient applied via
 * background-clip text technique.  Uses the `.gradient-text` utility
 * defined in index.css so the gradient matches the global brand token.
 *
 * @example
 * <h1>
 *   Operate hosted systems <GradientText>with clarity</GradientText>
 * </h1>
 */

import { ReactNode } from 'react';

interface GradientTextProps {
  /** Text or elements to render with the gradient applied. */
  children: ReactNode;
  /** Additional Tailwind classes (font-size, weight, etc.). */
  className?: string;
}

export function GradientText({ children, className = '' }: GradientTextProps) {
  return (
    <span className={`gradient-text ${className}`}>
      {children}
    </span>
  );
}

