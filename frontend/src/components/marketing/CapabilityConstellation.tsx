/**
 * CapabilityConstellation
 *
 * Six platform capabilities presented in a uniform bordered grid.
 * Gap-line technique (gap-px on a bordered wrapper) creates a clean
 * spreadsheet-like feel — dense and readable, not decorative.
 */

import { useScrollReveal } from '../../hooks/useScrollReveal';
import { SectionLabel } from './SectionLabel';
import { CAPABILITIES } from '../../content/landingContent';

const STAGGER = [
  'reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3',
  'reveal-delay-2', 'reveal-delay-3', 'reveal-delay-4',
] as const;

export function CapabilityConstellation() {
  const { ref: headerRef, visible: headerVisible } = useScrollReveal();
  const { ref: gridRef, visible: gridVisible } = useScrollReveal({ threshold: 0.05 });

  return (
    <section className="border-t border-m-border bg-m-bg py-24">
      <div className="mx-auto max-w-5xl px-6">
        {/* ── Section header ──────────────────────────────────────────── */}
        <div
          ref={headerRef}
          className={`mb-16 reveal-hidden ${headerVisible ? 'reveal-visible' : ''}`}
        >
          <SectionLabel>{CAPABILITIES.label}</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {CAPABILITIES.headline}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
            {CAPABILITIES.subheadline}
          </p>
        </div>

        {/* ── Capability grid — bordered cells with gap-line separators ── */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 overflow-hidden rounded-lg border border-m-border sm:grid-cols-2 lg:grid-cols-3"
        >
          {CAPABILITIES.items.map((item, idx) => (
            <div
              key={item.title}
              className={[
                'border-b border-r border-m-border bg-m-panel p-6',
                'transition-colors duration-150 hover:bg-slate-800/60',
                'reveal-hidden', STAGGER[idx],
                gridVisible ? 'reveal-visible' : '',
              ].join(' ')}
            >
              <p className="mb-4 font-mono text-xs text-slate-600">
                {String(idx + 1).padStart(2, '0')}
              </p>
              <h3 className="mb-2 text-sm font-semibold text-white">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-500">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

