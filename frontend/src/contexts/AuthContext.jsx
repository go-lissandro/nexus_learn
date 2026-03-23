/**
 * NexusLearn — AuthContext
 * Estado global de autenticação.
 * Escuta o evento "auth:logout" disparado pelo api.js quando a sessão é revogada.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authService.getStoredUser());
  const [loading, setLoading] = useState(!!authService.getStoredUser());

  // Logout automático quando o evento é disparado pelo api.js (sessão revogada)
  const handleForceLogout = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, [handleForceLogout]);

  // Valida o token armazenado na montagem
  useEffect(() => {
    if (!user) return;
    authService
      .getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data);
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: user?.is_admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
};
