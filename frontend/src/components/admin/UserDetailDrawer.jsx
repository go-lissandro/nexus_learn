/**
 * NexusLearn — UserDetailDrawer
 * Painel lateral com dados completos de um usuário:
 * info, controles de conta e lista de sessões com revogação.
 */
import React, { useState, useEffect } from "react";
import { adminService } from "../../services/api";
import {
  Button, StatusBadge, RoleBadge, Avatar, Spinner, Card, StatCard, formatDate,
} from "../atoms";

export default function UserDetailDrawer({ userId, onClose, onUpdated }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    adminService
      .getUserDetail(userId)
      .then(setUser)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleToggleActive = async () => {
    if (!user) return;
    const action = user.is_active ? "desativar" : "ativar";
    if (!window.confirm(`Confirma ${action} a conta de ${user.username}?`)) return;
    setSaving(true);
    try {
      const updated = await adminService.updateUser(user.id, { is_active: !user.is_active });
      setUser((prev) => ({ ...prev, ...updated, sessions: prev.sessions }));
      onUpdated?.();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAdmin = async () => {
    if (!user) return;
    if (!window.confirm(`Alterar permissão de ${user.username} para ${user.is_admin ? "Usuário" : "Admin"}?`)) return;
    setSaving(true);
    try {
      const updated = await adminService.updateUser(user.id, { is_admin: !user.is_admin });
      setUser((prev) => ({ ...prev, ...updated, sessions: prev.sessions }));
      onUpdated?.();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm("Revogar esta sessão agora?")) return;
    setRevoking(sessionId);
    try {
      await adminService.revokeSession(sessionId);
      setUser((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.session_id === sessionId ? { ...s, is_active: false } : s
        ),
      }));
    } catch (e) {
      alert(e.message);
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm(`Revogar TODAS as sessões de ${user.username}? O usuário será deslogado de todos os dispositivos.`)) return;
    setRevokingAll(true);
    try {
      await adminService.revokeAllUserSessions(user.id);
      setUser((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) => ({ ...s, is_active: false })),
      }));
    } catch (e) {
      alert(e.message);
    } finally {
      setRevokingAll(false);
    }
  };

  const activeSessions = user?.sessions?.filter((s) => s.is_active) ?? [];

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex justify-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-gray-900 text-base">Detalhes do Usuário</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center flex-1"><Spinner size="lg" /></div>
        ) : error ? (
          <div className="p-6 text-red-600 text-sm">{error}</div>
        ) : user && (
          <div className="p-6 space-y-6">
            {/* Perfil */}
            <div className="flex items-start gap-4">
              <Avatar name={user.username} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900 text-lg">{user.username}</h3>
                  <RoleBadge isAdmin={user.is_admin} />
                  <StatusBadge active={user.is_active} />
                </div>
                <p className="text-sm text-gray-500">{user.email}</p>
                {user.full_name && <p className="text-sm text-gray-600 mt-0.5">{user.full_name}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Cadastrado em {formatDate(user.created_at)}
                </p>
              </div>
            </div>

            {/* Stats de gamificação */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="XP Total" value={user.xp_total.toLocaleString()} color="indigo" />
              <StatCard label="Nível" value={user.level} color="emerald" />
              <StatCard label="Sequência" value={`${user.streak_days}d`} color="amber" />
            </div>

            {/* Ações da conta */}
            <Card className="p-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Gerenciar Conta</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={user.is_active ? "danger" : "success"}
                  size="sm"
                  loading={saving}
                  onClick={handleToggleActive}
                >
                  {user.is_active ? "Desativar Conta" : "Reativar Conta"}
                </Button>
                <Button
                  variant={user.is_admin ? "warning" : "ghost"}
                  size="sm"
                  loading={saving}
                  onClick={handleToggleAdmin}
                >
                  {user.is_admin ? "Remover Admin" : "Tornar Admin"}
                </Button>
                {activeSessions.length > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={revokingAll}
                    onClick={handleRevokeAll}
                  >
                    Revogar Todas ({activeSessions.length})
                  </Button>
                )}
              </div>
            </Card>

            {/* Sessões */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Sessões ({user.sessions?.length ?? 0})
              </h4>
              {user.sessions?.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma sessão registrada.</p>
              ) : (
                <div className="space-y-2">
                  {user.sessions.map((s) => (
                    <div
                      key={s.session_id}
                      className={`rounded-lg border p-3 text-sm ${
                        s.is_active
                          ? "border-indigo-200 bg-indigo-50"
                          : "border-gray-100 bg-gray-50 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-800">
                              {s.device_info || "Dispositivo desconhecido"}
                            </span>
                            <StatusBadge active={s.is_active} labels={["Ativa", "Encerrada"]} />
                          </div>
                          <p className="text-xs text-gray-500 font-mono">{s.ip_address || "IP desconhecido"}</p>
                          <p className="text-xs text-gray-400">
                            Criada: {formatDate(s.created_at)}
                          </p>
                          {s.last_seen_at && (
                            <p className="text-xs text-gray-400">
                              Último acesso: {formatDate(s.last_seen_at)}
                            </p>
                          )}
                          {!s.is_active && s.revoke_reason && (
                            <p className="text-xs text-red-500 mt-1">
                              Motivo: {s.revoke_reason}
                            </p>
                          )}
                        </div>
                        {s.is_active && (
                          <Button
                            variant="danger"
                            size="sm"
                            loading={revoking === s.session_id}
                            onClick={() => handleRevokeSession(s.session_id)}
                          >
                            Revogar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
