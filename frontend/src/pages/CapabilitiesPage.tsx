/**
 * CapabilitiesPage — "Capability Constellation"
 *
 * Route: /capabilities
 *
 * Renders the platform capabilities grid as a standalone page.
 */

import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { CapabilityConstellation } from '../components/marketing/CapabilityConstellation';

export function CapabilitiesPage() {
  return (
    <MarketingLayout>
      <CapabilityConstellation />
    </MarketingLayout>
  );
}

