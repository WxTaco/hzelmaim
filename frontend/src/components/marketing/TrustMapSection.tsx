/**
 * TrustMapSection
 *
 * "Trust Without Friction" — two-column layout.
 * Left: headline, subheadline, pull-quote.
 * Right: four trust points as a plain numbered list.
 * No decorative elements — the copy carries it.
 */

import { useScrollReveal } from '../../hooks/useScrollReveal';
import { SectionLabel } from './SectionLabel';
import { TRUST } from '../../content/landingContent';

export function TrustMapSection() {
  const { ref: leftRef, visible: leftVisible } = useScrollReveal();
  const { ref: rightRef, visible: rightVisible } = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="border-t border-m-border bg-m-surface py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">

          {/* ── Left: copy ──────────────────────────────────────────────── */}
          <div
            ref={leftRef}
            className={`flex flex-col gap-6 reveal-hidden ${leftVisible ? 'reveal-visible' : ''}`}
          >
            <SectionLabel>{TRUST.label}</SectionLabel>

            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {TRUST.headline}
            </h2>

            <p className="text-base leading-relaxed text-slate-400">
              {TRUST.subheadline}
            </p>

            <blockquote className="border-l-2 border-m-border pl-5">
              <p className="text-sm leading-relaxed text-slate-400 italic">
                "{TRUST.quote}"
              </p>
            </blockquote>
          </div>

          {/* ── Right: numbered trust points ────────────────────────────── */}
          <div
            ref={rightRef}
            className={`divide-y divide-m-border reveal-hidden ${rightVisible ? 'reveal-visible' : ''}`}
          >
            {TRUST.points.map((point, idx) => (
              <div
                key={point.title}
                className={`flex gap-5 py-6 reveal-delay-${idx + 1}`}
              >
                <span className="mt-0.5 w-6 shrink-0 font-mono text-xs text-slate-600">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-white">
                    {point.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-500">
                    {point.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}

