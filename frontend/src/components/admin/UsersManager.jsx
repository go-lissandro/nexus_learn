/**
 * NexusLearn — UsersManager
 * Tabela de usuários com busca, filtro e acesso ao drawer de detalhes.
 */
import React, { useState, useEffect, useCallback } from "react";
import { adminService } from "../../services/api";
import {
  Button, StatusBadge, RoleBadge, Avatar, Spinner, EmptyState, Card, formatDate,
} from "../atoms";
import UserDetailDrawer from "./UserDetailDrawer";

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (search) params.search = search;
      if (onlyActive !== null) params.only_active = onlyActive;
      const data = await adminService.listUsers(params);
      setUsers(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, onlyActive]);

  // Debounce da busca
  useEffect(() => {
    const t = setTimeout(() => load(), 400);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={onlyActive === null ? "" : String(onlyActive)}
          onChange={(e) => setOnlyActive(e.target.value === "" ? null : e.target.value === "true")}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos os status</option>
          <option value="true">Somente ativos</option>
          <option value="false">Somente inativos</option>
        </select>
        <span className="text-xs text-gray-400">{users.length} usuário(s)</span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : users.length === 0 ? (
        <EmptyState message="Nenhum usuário encontrado." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Usuário", "Email", "XP / Nível", "Streak", "Status", "Função", "Cadastro", "Ações"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.username} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{u.username}</p>
                          {u.full_name && (
                            <p className="text-xs text-gray-400">{u.full_name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-indigo-600">{u.xp_total.toLocaleString()} XP</span>
                      <span className="text-gray-400 text-xs ml-1">Nv.{u.level}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {u.streak_days > 0 ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          🔥 {u.streak_days}d
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={u.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge isAdmin={u.is_admin} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUserId(u.id)}
                      >
                        Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedUserId && (
        <UserDetailDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}
