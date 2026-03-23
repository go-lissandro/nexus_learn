/**
 * NexusLearn — AdminOverview
 * Cards de métricas do painel administrativo.
 */
import React, { useState, useEffect } from "react";
import { adminService } from "../../services/api";
import { StatCard, Spinner } from "../atoms";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminService
      .getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Métricas principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de usuários"
          value={stats.total_users.toLocaleString()}
          color="indigo"
        />
        <StatCard
          label="Usuários ativos"
          value={stats.active_users.toLocaleString()}
          delta={`${Math.round((stats.active_users / (stats.total_users || 1)) * 100)}% do total`}
          color="emerald"
        />
        <StatCard
          label="Sessões ativas agora"
          value={stats.active_sessions.toLocaleString()}
          color="amber"
        />
        <StatCard
          label="Novos hoje"
          value={stats.new_users_today.toLocaleString()}
          delta={`${stats.new_users_week} esta semana`}
          color="indigo"
        />
      </div>

      {/* Aviso de sessões */}
      {stats.active_sessions > 0 && (
        <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-800">
          <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
          </svg>
          <span>
            <strong>{stats.active_sessions}</strong> sessão(ões) ativa(s) no momento.
            Use a aba <strong>Sessões</strong> para revogar acessos em tempo real.
          </span>
        </div>
      )}

      {/* Guia rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: "👥",
            title: "Gerenciar Usuários",
            desc: "Ative, desative contas e altere permissões de administrador.",
            tab: "users",
          },
          {
            icon: "🔐",
            title: "Controle de Sessões",
            desc: "Revogue sessões individuais ou todas as sessões de um usuário.",
            tab: "sessions",
          },
          {
            icon: "📊",
            title: "Monitoramento",
            desc: "Acompanhe novos cadastros, atividade e métricas em tempo real.",
            tab: null,
          },
        ].map((item) => (
          <div key={item.title} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl mb-2">{item.icon}</div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
