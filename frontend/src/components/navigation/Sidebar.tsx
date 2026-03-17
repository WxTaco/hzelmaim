/**
 * Primary application navigation.
 */

import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Dashboard' },
  { to: '/containers', label: 'Containers' },
  { to: '/commands', label: 'Commands' },
  { to: '/terminal', label: 'Terminal' },
  { to: '/login', label: 'Auth' },
];

export function Sidebar() {
  return (
    <aside className="w-full max-w-64 border-r border-slate-800 bg-slate-950/80 p-4">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">HZEL</p>
        <h1 className="text-xl font-bold text-white">Control Plane</h1>
      </div>
      <nav className="space-y-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
