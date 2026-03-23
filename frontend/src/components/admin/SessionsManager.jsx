/**
 * NexusLearn — SessionsManager
 * Lista todas as sessões ativas com possibilidade de revogação individual.
 */
import React, { useState, useEffect, useCallback } from "react";
import { adminService } from "../../services/api";
import {
  Button, StatusBadge, Avatar, Spinner, EmptyState, Card, formatDate,
} from "../atoms";

export default function SessionsManager() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminService.listSessions(onlyActive);
      setSessions(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [onlyActive]);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async (sessionId) => {
    if (!window.confirm("Revogar esta sessão? O usuário será deslogado imediatamente.")) return;
    setRevoking(sessionId);
    try {
      await adminService.revokeSession(sessionId);
      setSessions((prev) =>
        prev.map((s) =>
          s.session_id === sessionId ? { ...s, is_active: false } : s
        )
      );
    } catch (e) {
      alert(e.message);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600"
            />
            Somente ativas
          </label>
          <span className="text-xs text-gray-400">
            {sessions.length} sessão(ões)
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={load}>
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : sessions.length === 0 ? (
        <EmptyState message="Nenhuma sessão encontrada." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Usuário ID", "Device", "IP", "Criada em", "Último acesso", "Status", "Ação"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s) => (
                  <tr key={s.session_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600">
                      #{s.user_id}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {s.device_info || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {s.ip_address || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(s.created_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(s.last_seen_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={s.is_active} labels={["Ativa", "Revogada"]} />
                    </td>
                    <td className="px-4 py-3">
                      {s.is_active ? (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={revoking === s.session_id}
                          onClick={() => handleRevoke(s.session_id)}
                        >
                          Revogar
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {s.revoke_reason || "Encerrada"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
