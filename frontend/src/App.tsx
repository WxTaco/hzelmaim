/**
 * Top-level route composition for the React application.
 */

import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ContainerDetailPage } from './pages/ContainerDetailPage';
import { ContainersPage } from './pages/ContainersPage';
import { CommandsPage } from './pages/CommandsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { TerminalPage } from './pages/TerminalPage';

function ShellPage({ title, children }: { title: string; children: JSX.Element }) {
  return <AppShell title={title}>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ShellPage title="Dashboard"><DashboardPage /></ShellPage>} />
      <Route path="/containers" element={<ShellPage title="Containers"><ContainersPage /></ShellPage>} />
      <Route path="/containers/:containerId" element={<ShellPage title="Container Detail"><ContainerDetailPage /></ShellPage>} />
      <Route path="/commands" element={<ShellPage title="Commands"><CommandsPage /></ShellPage>} />
      <Route path="/terminal" element={<ShellPage title="Terminal"><TerminalPage /></ShellPage>} />
    </Routes>
  );
}