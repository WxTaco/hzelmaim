/**
 * PrinciplesPage — "Built Around Use"
 *
 * Route: /principles
 *
 * Renders the philosophy / design-principles section as a standalone page.
 */

import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { PhilosophySection } from '../components/marketing/PhilosophySection';

export function PrinciplesPage() {
  return (
    <MarketingLayout>
      <PhilosophySection />
    </MarketingLayout>
  );
}

