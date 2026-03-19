/**
 * Primary application navigation sidebar.
 * Displays branding and navigation links with active state highlighting.
 */

import { NavLink } from 'react-router-dom';

/**
 * Navigation item configuration.
 */
interface NavItem {
  /** Route path */
  to: string;
  /** Display label */
  label: string;
}

/**
 * Navigation items for the sidebar.
 */
const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/containers', label: 'Containers' },
  { to: '/commands', label: 'Commands' },
  { to: '/terminal', label: 'Terminal' },
  { to: '/login', label: 'Auth' },
];

/**
 * Sidebar navigation component.
 * Renders application branding and main navigation links.
 * Active links are highlighted with a distinct background color.
 */
export function Sidebar(): React.ReactElement {
  return (
    <aside className="w-full max-w-64 border-r border-vercel-border bg-vercel-surface p-6">
      {/* Branding section */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-vercel-muted">HZEL</p>
        <h1 className="mt-2 text-lg font-bold text-vercel-text">Control Plane</h1>
      </div>
      {/* Navigation links */}
      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-vercel-accent text-vercel-bg'
                  : 'text-vercel-muted hover:text-vercel-text hover:bg-vercel-card'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
