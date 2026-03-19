/**
 * Top-level route composition for the React application.
 *
 * Marketing routes  — rendered inside MarketingLayout (no AppShell)
 *   /                → LandingPage     (hero / platform)
 *   /principles      → PrinciplesPage  (design principles)
 *   /capabilities    → CapabilitiesPage
 *   /trust           → TrustPage
 *   /system          → SystemPage      (architecture + closing CTA)
 *
 * Authenticated routes — rendered inside AppShell
 *   /dashboard       → DashboardPage   (was `/`)
 *   /containers      → ContainersPage
 *   /containers/:id  → ContainerDetailPage
 *   /commands        → CommandsPage
 *   /terminal        → TerminalPage
 *
 * Auth route
 *   /login           → LoginPage
 */

import { ReactElement } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RequireAuth } from './auth/RequireAuth';
import { ContainerDetailPage } from './pages/ContainerDetailPage';
import { ContainersPage } from './pages/ContainersPage';
import { CommandsPage } from './pages/CommandsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { PrinciplesPage } from './pages/PrinciplesPage';
import { CapabilitiesPage } from './pages/CapabilitiesPage';
import { TrustPage } from './pages/TrustPage';
import { SystemPage } from './pages/SystemPage';
import { LoginPage } from './pages/LoginPage';
import { TerminalPage } from './pages/TerminalPage';

/** Thin wrapper that injects an AppShell with a title around a page. */
function ShellPage({ title, children }: { title: string; children: ReactElement }) {
  return <AppShell title={title}>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      {/* ── Marketing routes (no AppShell) ─────────────────────────── */}
      <Route path="/"             element={<LandingPage />} />
      <Route path="/principles"   element={<PrinciplesPage />} />
      <Route path="/capabilities" element={<CapabilitiesPage />} />
      <Route path="/trust"        element={<TrustPage />} />
      <Route path="/system"       element={<SystemPage />} />

      {/* ── Auth route ──────────────────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />

      {/* ── Authenticated app routes (AppShell + RequireAuth) ────────── */}
      <Route path="/dashboard"  element={<RequireAuth><ShellPage title="Dashboard"><DashboardPage /></ShellPage></RequireAuth>} />
      <Route path="/containers" element={<RequireAuth><ShellPage title="Containers"><ContainersPage /></ShellPage></RequireAuth>} />
      <Route path="/containers/:containerId" element={<RequireAuth><ShellPage title="Container Detail"><ContainerDetailPage /></ShellPage></RequireAuth>} />
      <Route path="/commands"  element={<RequireAuth><ShellPage title="Commands"><CommandsPage /></ShellPage></RequireAuth>} />
      <Route path="/terminal"  element={<RequireAuth><ShellPage title="Terminal"><TerminalPage /></ShellPage></RequireAuth>} />
    </Routes>
  );
}