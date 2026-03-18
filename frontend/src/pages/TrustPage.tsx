/**
 * TrustPage — "Trust Without Friction"
 *
 * Route: /trust
 *
 * Renders the trust and access-control section as a standalone page.
 */

import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { TrustMapSection } from '../components/marketing/TrustMapSection';

export function TrustPage() {
  return (
    <MarketingLayout>
      <TrustMapSection />
    </MarketingLayout>
  );
}

