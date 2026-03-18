/**
 * SystemPage — "System Flow"
 *
 * Route: /system
 *
 * Renders the architecture flow section followed by the closing CTA panel.
 * The ClosingPanel is placed here because its CTA ("Review architecture")
 * is most meaningful after reading the system overview.
 */

import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { SystemFlowSection } from '../components/marketing/SystemFlowSection';
import { ClosingPanel } from '../components/marketing/ClosingPanel';

export function SystemPage() {
  return (
    <MarketingLayout>
      <SystemFlowSection />
      <ClosingPanel />
    </MarketingLayout>
  );
}

