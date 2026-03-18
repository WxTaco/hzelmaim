/**
 * MarketingLayout
 *
 * Shared layout wrapper for every marketing route.
 * Renders the sticky `MarketingNav` above the page content and applies
 * the global marketing background and text defaults, so individual page
 * components don't need to repeat these concerns.
 *
 * @example
 * export function CapabilitiesPage() {
 *   return (
 *     <MarketingLayout>
 *       <CapabilityConstellation />
 *     </MarketingLayout>
 *   );
 * }
 */

import { ReactNode } from 'react';
import { MarketingNav } from './MarketingNav';

interface MarketingLayoutProps {
  /** The page's section component(s). */
  children: ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-m-bg text-slate-100 antialiased">
      <MarketingNav />
      {children}
    </div>
  );
}

