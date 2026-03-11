/**
 * Manager Dashboard — App Root
 * AGENT-FRONTEND-MANAGER
 *
 * Wraps the app with:
 *   - Redux Provider (store)
 *   - React Router v6 (BrowserRouter)
 *
 * Routes:
 *   /               → Dashboard (live map + KPIs + route list)
 *   /routes/new     → CreateRoutePage (multi-step route creation)
 *   /drivers/:id    → DriverDetailPage (future — stub redirect for now)
 */

import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './redux/store';
import Dashboard from './components/Dashboard';
import CreateRoutePage from './pages/CreateRoutePage';

// ── Navbar ─────────────────────────────────────────────────────────────────────

const Navbar: React.FC = () => {
  return (
    <nav
      className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0 z-30"
      aria-label="Navigation principale"
    >
      {/* Logo */}
      <a
        href="/"
        className="font-bold text-xl text-green-600 tracking-tight hover:text-green-700 focus:outline-none focus:underline"
        aria-label="GERVIFRAIS — Tableau de bord"
      >
        GERVIFRAIS
      </a>

      <div className="flex-1" />

      {/* Create route CTA */}
      <a
        href="/routes/new"
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
        aria-label="Créer une nouvelle tournée"
      >
        <span aria-hidden="true">+</span>
        Nouvelle tournée
      </a>
    </nav>
  );
};

// ── Layout ─────────────────────────────────────────────────────────────────────

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
    <Navbar />
    <main className="flex flex-1 overflow-hidden" role="main">
      {children}
    </main>
  </div>
);

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />
          <Route
            path="/routes/new"
            element={<CreateRoutePage />}
          />
          {/* Fallback: redirect unknown paths to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}
