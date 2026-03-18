/**
 * MarketingNav
 *
 * Sticky top navigation shared across all marketing routes.
 * Links use React Router `<Link>` for client-side navigation.
 * Becomes opaque with a blur backdrop once the user scrolls past the fold.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NAV_LINKS } from '../../content/landingContent';

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);

  /** Track scroll position to apply the opaque-on-scroll style. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-m-border bg-m-bg/95 backdrop-blur-md'
          : 'bg-transparent',
      ].join(' ')}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Wordmark — navigates to the hero/platform page */}
        <Link to="/" className="font-mono text-sm font-semibold tracking-widest text-white">
          HZEL
        </Link>

        {/* Route links — hidden on small screens */}
        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <li key={href}>
              <Link
                to={href}
                className="text-sm text-slate-400 transition-colors duration-200 hover:text-white"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Architecture shortcut */}
        <Link
          to="/system"
          className="text-sm text-slate-400 transition-colors duration-200 hover:text-white"
        >
          View architecture
        </Link>
      </nav>
    </header>
  );
}

