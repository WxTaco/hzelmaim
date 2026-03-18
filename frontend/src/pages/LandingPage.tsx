/**
 * LandingPage — Hero / Platform page
 *
 * Route: /
 *
 * The public entry point for HZEL. Renders only the full-viewport hero
 * section; all other content lives on its own dedicated route.
 */

import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { HeroCanvas } from '../components/marketing/HeroCanvas';

export function LandingPage() {
  return (
    <MarketingLayout>
      <HeroCanvas />
    </MarketingLayout>
  );
}

