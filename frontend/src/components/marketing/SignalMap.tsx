/**
 * SignalMap
 *
 * Decorative hero right-column visualization.
 * Renders a cluster of glowing signal nodes connected by thin gradient
 * lines, suggesting a live platform control surface without being a
 * literal screenshot or a cluttered diagram.
 *
 * All elements are aria-hidden — this is purely presentational.
 */

/** A single pulsing signal node dot. */
function SignalDot({
  size = 'md',
  color = 'cyan',
  delay = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'violet' | 'blue' | 'emerald';
  delay?: string;
}) {
  const sizes = { sm: 'h-2 w-2', md: 'h-3 w-3', lg: 'h-5 w-5' };
  const colors = {
    cyan: 'bg-cyan-400 shadow-cyan-400/70',
    violet: 'bg-violet-400 shadow-violet-400/70',
    blue: 'bg-blue-400 shadow-blue-400/70',
    emerald: 'bg-emerald-400 shadow-emerald-400/70',
  };
  return (
    <div
      aria-hidden
      style={{ animationDelay: delay }}
      className={`animate-signal-pulse rounded-full shadow-lg ${sizes[size]} ${colors[color]}`}
    />
  );
}

/** A thin gradient connecting line between nodes. */
function SignalLine({ vertical = false, className = '' }: { vertical?: boolean; className?: string }) {
  return (
    <div
      aria-hidden
      className={[
        vertical ? 'w-px h-16' : 'h-px w-16',
        'bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent',
        className,
      ].join(' ')}
    />
  );
}

/** A small glassmorphic status card floating in the signal map. */
function StatusCard({ label, value, accent = 'cyan' }: { label: string; value: string; accent?: 'cyan' | 'emerald' | 'violet' }) {
  const accents = {
    cyan: 'border-cyan-500/30 text-cyan-300',
    emerald: 'border-emerald-500/30 text-emerald-300',
    violet: 'border-violet-500/30 text-violet-300',
  };
  return (
    <div
      aria-hidden
      className={`rounded-lg border bg-m-panel/70 px-4 py-2.5 text-xs backdrop-blur-sm ${accents[accent]}`}
    >
      <div className="text-slate-400">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

export function SignalMap() {
  return (
    <div aria-hidden className="relative flex h-[420px] w-full select-none items-center justify-center">
      {/* Floating card — top-left */}
      <div className="animate-float absolute left-0 top-8">
        <StatusCard label="Lifecycle" value="3 active" accent="cyan" />
      </div>

      {/* Floating card — top-right */}
      <div className="animate-float-late absolute right-0 top-16">
        <StatusCard label="Commands" value="12 queued" accent="emerald" />
      </div>

      {/* Central node cluster */}
      <div className="flex flex-col items-center gap-4">
        {/* Top row */}
        <div className="flex items-center gap-6">
          <SignalDot size="sm" color="cyan" delay="0s" />
          <SignalLine />
          <SignalDot size="lg" color="cyan" delay="0.4s" />
          <SignalLine />
          <SignalDot size="sm" color="violet" delay="0.8s" />
        </div>

        {/* Middle vertical connectors */}
        <div className="flex items-start justify-center gap-12 px-4">
          <SignalLine vertical className="via-violet-500/50" />
          <SignalLine vertical />
          <SignalLine vertical className="via-blue-500/50" />
        </div>

        {/* Center row */}
        <div className="flex items-center gap-6">
          <SignalDot size="md" color="violet" delay="0.2s" />
          <SignalLine className="via-violet-500/50" />
          <SignalDot size="lg" color="blue" delay="0.6s" />
          <SignalLine className="via-blue-500/50" />
          <SignalDot size="md" color="emerald" delay="1s" />
        </div>

        {/* Lower vertical connectors */}
        <div className="flex items-start justify-center gap-12 px-4">
          <SignalLine vertical className="via-cyan-500/30" />
          <SignalLine vertical className="via-blue-500/30" />
          <SignalLine vertical className="via-emerald-500/30" />
        </div>

        {/* Bottom row */}
        <div className="flex items-center gap-6">
          <SignalDot size="sm" color="cyan" delay="0.3s" />
          <SignalLine />
          <SignalDot size="md" color="emerald" delay="0.7s" />
          <SignalLine className="via-emerald-500/50" />
          <SignalDot size="sm" color="blue" delay="1.1s" />
        </div>
      </div>

      {/* Floating card — bottom-left */}
      <div className="animate-float absolute bottom-10 left-4">
        <StatusCard label="Audit trail" value="Live" accent="violet" />
      </div>

      {/* Floating card — bottom-right */}
      <div className="animate-float-late absolute bottom-6 right-0">
        <StatusCard label="Access" value="OIDC-ready" accent="cyan" />
      </div>
    </div>
  );
}

