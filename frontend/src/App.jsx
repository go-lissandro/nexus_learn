/**
 * NexusLearn — App.jsx
 * Roteamento principal com proteção de rotas por autenticação e admin.
 */
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import AdminPanel from "./pages/admin/AdminPanel";
import { Spinner } from "./components/atoms";

// ─── Guards ──────────────────────────────────────────────

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/" replace />;
  return children;
}

function RedirectIfAuth({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to={user.is_admin ? "/admin" : "/"} replace />;
  return children;
}

// ─── App ─────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuth>
            <LoginPage />
          </RedirectIfAuth>
        }
      />
      <Route
        path="/admin/*"
        element={
          <RequireAdmin>
            <AdminPanel />
          </RequireAdmin>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            {/* Placeholder — substituir pelo Dashboard do aluno */}
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <p className="text-gray-500">Dashboard do aluno (em construção)</p>
            </div>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
