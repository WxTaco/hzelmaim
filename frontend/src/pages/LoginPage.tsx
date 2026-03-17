/**
 * Authentication page placeholder for session and OIDC flows.
 */

import { Card } from '../components/ui/Card';

export function LoginPage() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <Card title="Authentication" subtitle="Session bootstrap and OIDC redirect entry point.">
        <div className="space-y-4 text-sm text-slate-300">
          <p>The production login flow will redirect to the configured identity provider.</p>
          <button className="rounded-lg bg-accent px-4 py-2 font-medium text-slate-950">Continue with identity provider</button>
        </div>
      </Card>
    </div>
  );
}
