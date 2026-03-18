/**
 * HeroCanvas
 *
 * Full-viewport opening section of the landing page.
 * Typographic-only layout — no decorative visuals.
 * A faint gradient wash provides depth without being a visible shape.
 */

import { Link } from 'react-router-dom';
import { AuroraBackground } from './AuroraBackground';
import { HERO } from '../../content/landingContent';

export function HeroCanvas() {
  return (
    <AuroraBackground className="bg-m-bg">
      <section
        className="flex min-h-screen flex-col items-center justify-center px-6 pb-20 pt-32 text-center"
      >
        <div className="mx-auto max-w-4xl">
          {/* Mono eyebrow */}
          <p className="mb-8 font-mono text-xs font-medium uppercase tracking-widest text-slate-500">
            {HERO.eyebrow}
          </p>

          {/* Headline — two visual lines, second line steps down in tone */}
          <h1 className="mb-8 text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-[4.5rem]">
            Operate hosted systems
            <br />
            <span className="text-slate-400">with clarity</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-slate-400">
            {HERO.subheadline}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/capabilities"
              className="rounded-md bg-white px-7 py-3 text-sm font-semibold text-slate-950 transition-opacity duration-150 hover:opacity-85"
            >
              {HERO.primaryCta}
            </Link>
            <Link
              to="/system"
              className="rounded-md border border-white/20 px-7 py-3 text-sm font-semibold text-slate-300 transition-colors duration-150 hover:border-white/40 hover:text-white"
            >
              {HERO.secondaryCta}
            </Link>
          </div>

          {/* Metadata strip — dot-separated, no pill shapes */}
          <div className="mt-12 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-slate-600">
            {HERO.pills.map((pill, i) => (
              <span key={pill} className="flex items-center gap-5">
                {i > 0 && <span aria-hidden className="text-slate-700">·</span>}
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>
    </AuroraBackground>
  );
}

