/**
 * ClosingPanel
 *
 * Final landing page section.
 * Plain centered layout — headline, subheadline, two CTAs.
 * No radial glows or decorative elements; the whitespace does the work.
 */

import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { SectionLabel } from './SectionLabel';
import { CLOSING } from '../../content/landingContent';

export function ClosingPanel() {
  const { ref, visible } = useScrollReveal({ threshold: 0.2 });

  return (
    <section className="border-t border-m-border bg-m-surface py-32">
      <div className="mx-auto max-w-3xl px-6">
        <div
          ref={ref}
          className={`flex flex-col items-center gap-8 text-center reveal-hidden ${visible ? 'reveal-visible' : ''}`}
        >
          <SectionLabel>{CLOSING.label}</SectionLabel>

          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {CLOSING.headline}
          </h2>

          <p className="max-w-xl text-base leading-relaxed text-slate-400">
            {CLOSING.subheadline}
          </p>

          {/* Single CTA */}
          <Link
            to="/system"
            className="rounded-md bg-white px-7 py-3 text-sm font-semibold text-slate-950 transition-opacity duration-150 hover:opacity-85"
          >
            {CLOSING.cta}
          </Link>

          <p className="text-xs text-slate-600">{CLOSING.caption}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-24 border-t border-m-border pt-8 text-center">
        <p className="text-xs text-slate-700">
          © {new Date().getFullYear()} HZEL. All rights reserved.
        </p>
      </div>
    </section>
  );
}

