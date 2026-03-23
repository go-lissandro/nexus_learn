/**
 * NexusLearn — API Service Layer
 * Centraliza todas as chamadas HTTP ao backend FastAPI.
 * Lida com token, refresh e logout automático em 401.
 */

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ─── HTTP helper ──────────────────────────────────────────

async function request(method, path, body = null, requiresAuth = true) {
  const headers = { "Content-Type": "application/json" };

  if (requiresAuth) {
    const token = localStorage.getItem("access_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Sessão revogada pelo admin — desloga automaticamente
  if (res.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth:logout"));
    const data = await res.json();
    throw new Error(data.detail || "Sessão expirada.");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Erro ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ─── AUTH ─────────────────────────────────────────────────

export const authService = {
  async login(email, password) {
    const data = await request("POST", "/auth/login", { email, password }, false);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data));
    return data;
  },

  async register(username, email, password, full_name) {
    return request("POST", "/auth/register", { username, email, password, full_name }, false);
  },

  async logout() {
    try {
      await request("POST", "/auth/logout");
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }
  },

  async getMe() {
    return request("GET", "/auth/me");
  },

  getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  },
};

// ─── ADMIN ────────────────────────────────────────────────

export const adminService = {
  async getStats() {
    return request("GET", "/admin/stats");
  },

  async listUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/admin/users?${qs}`);
  },

  async getUserDetail(userId) {
    return request("GET", `/admin/users/${userId}`);
  },

  async updateUser(userId, body) {
    return request("PATCH", `/admin/users/${userId}`, body);
  },

  async listSessions(onlyActive = true) {
    return request("GET", `/admin/sessions?only_active=${onlyActive}`);
  },

  async getUserSessions(userId) {
    return request("GET", `/admin/users/${userId}/sessions`);
  },

  async revokeSession(sessionId, reason = "Revogado pelo administrador") {
    return request("POST", `/admin/sessions/${sessionId}/revoke`, { reason });
  },

  async revokeAllUserSessions(userId, reason = "Revogação em massa pelo admin") {
    return request("POST", `/admin/users/${userId}/revoke-all`, { reason });
  },
};

// ─── GAMIFICAÇÃO ─────────────────────────────────────────

export const gamificationService = {
  async getProgress() {
    return request("GET", "/gamification/progress");
  },

  async getLeaderboard() {
    return request("GET", "/gamification/leaderboard");
  },
};
