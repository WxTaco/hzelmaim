/**
 * SystemFlowSection
 *
 * "System Flow" — five architecture layers rendered as a clean
 * numbered table.  Each row has a monospaced index, a title, and a
 * short description.  No diagram chrome, no colours per layer.
 */

import { useScrollReveal } from '../../hooks/useScrollReveal';
import { SectionLabel } from './SectionLabel';
import { SYSTEM } from '../../content/landingContent';

const STAGGER = [
  'reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3',
  'reveal-delay-4', 'reveal-delay-5',
] as const;

export function SystemFlowSection() {
  const { ref: headerRef, visible: headerVisible } = useScrollReveal();
  const { ref: tableRef, visible: tableVisible } = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="border-t border-m-border bg-m-bg py-24">
      <div className="mx-auto max-w-5xl px-6">

        {/* ── Section header ────────────────────────────────────────────── */}
        <div
          ref={headerRef}
          className={`mb-16 reveal-hidden ${headerVisible ? 'reveal-visible' : ''}`}
        >
          <SectionLabel>{SYSTEM.label}</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {SYSTEM.headline}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
            {SYSTEM.subheadline}
          </p>
        </div>

        {/* ── Layer table ───────────────────────────────────────────────── */}
        <div ref={tableRef} className="divide-y divide-m-border">
          {SYSTEM.layers.map((layer, idx) => (
            <div
              key={layer.title}
              className={[
                'grid grid-cols-[2rem_1fr_2fr] items-start gap-6 py-6',
                'transition-colors duration-150 hover:bg-slate-800/40',
                'reveal-hidden', STAGGER[idx],
                tableVisible ? 'reveal-visible' : '',
              ].join(' ')}
            >
              {/* Index */}
              <span className="font-mono text-xs text-slate-600">
                {String(idx + 1).padStart(2, '0')}
              </span>

              {/* Layer title */}
              <h3 className="text-sm font-semibold text-white">
                {layer.title}
              </h3>

              {/* Description */}
              <p className="text-sm leading-relaxed text-slate-500">
                {layer.body}
              </p>
            </div>
          ))}
        </div>

        {/* Caption */}
        <p className={`mt-10 text-xs text-slate-600 reveal-hidden ${headerVisible ? 'reveal-visible reveal-delay-5' : ''}`}>
          {SYSTEM.caption}
        </p>

      </div>
    </section>
  );
}

