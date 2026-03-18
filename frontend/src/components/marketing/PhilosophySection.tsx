/**
 * PhilosophySection
 *
 * "Built Around Use" — three design principles presented as a
 * clean numbered list on a darker background.  No cards, no decoration;
 * the content carries the section.
 */

import { useScrollReveal } from '../../hooks/useScrollReveal';
import { SectionLabel } from './SectionLabel';
import { PHILOSOPHY } from '../../content/landingContent';

const STAGGER = ['reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3'] as const;

export function PhilosophySection() {
  const { ref: headerRef, visible: headerVisible } = useScrollReveal();
  const { ref: listRef, visible: listVisible } = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="border-t border-m-border bg-m-surface py-24">
      <div className="mx-auto max-w-5xl px-6">
        {/* ── Section header ────────────────────────────────────────────── */}
        <div
          ref={headerRef}
          className={`mb-16 reveal-hidden ${headerVisible ? 'reveal-visible' : ''}`}
        >
          <SectionLabel>{PHILOSOPHY.label}</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {PHILOSOPHY.headline}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
            {PHILOSOPHY.subheadline}
          </p>
        </div>

        {/* ── Principles — numbered rows ────────────────────────────────── */}
        <div ref={listRef} className="divide-y divide-m-border">
          {PHILOSOPHY.principles.map((principle, idx) => (
            <div
              key={principle.title}
              className={`flex gap-8 py-8 reveal-hidden ${STAGGER[idx]} ${listVisible ? 'reveal-visible' : ''}`}
            >
              {/* Index */}
              <span className="w-8 shrink-0 font-mono text-sm text-slate-600">
                {String(idx + 1).padStart(2, '0')}
              </span>

              {/* Content */}
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-16">
                <h3 className="w-48 shrink-0 text-sm font-semibold text-white">
                  {principle.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  {principle.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

