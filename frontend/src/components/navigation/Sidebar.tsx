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
    <aside className="w-full max-w-64 border-r border-slate-800 bg-slate-950/80 p-4">
      {/* Branding section */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">HZEL</p>
        <h1 className="text-xl font-bold text-white">Control Plane</h1>
      </div>
      {/* Navigation links */}
      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-900'
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
