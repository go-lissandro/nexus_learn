/**
 * NexusLearn — AdminPanel (Página Completa)
 * Layout com abas: Visão Geral | Usuários | Sessões
 * Protegida por require_admin no backend e verificação de is_admin no frontend.
 */
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AdminOverview from "../../components/admin/AdminOverview";
import UsersManager from "../../components/admin/UsersManager";
import SessionsManager from "../../components/admin/SessionsManager";

const TABS = [
  { id: "overview",  label: "Visão Geral",  icon: "📊" },
  { id: "users",     label: "Usuários",     icon: "👥" },
  { id: "sessions",  label: "Sessões",      icon: "🔐" },
];

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Acesso Restrito</h2>
          <p className="text-gray-500 text-sm">Esta área é reservada a administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1L10 6H15L11 9.5L12.5 15L8 11.5L3.5 15L5 9.5L1 6H6L8 1Z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">NexusLearn</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Painel Administrativo</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-medium text-gray-800">{user.username}</p>
            <p className="text-xs text-indigo-600">Administrador</p>
          </div>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors border border-gray-200 rounded-lg px-3 py-1.5 hover:border-red-300"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar de navegação */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-4 gap-1 px-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left ${
                activeTab === tab.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}

          {/* Info rápida no rodapé da sidebar */}
          <div className="mt-auto mx-1 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs font-medium text-amber-800 mb-1">Revogação em tempo real</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Sessões revogadas aqui encerram o acesso imediatamente, mesmo com JWT válido.
            </p>
          </div>
        </aside>

        {/* Conteúdo principal */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Breadcrumb / título */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-900">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeTab === "overview" && "Resumo da plataforma e métricas gerais."}
              {activeTab === "users"    && "Gerencie contas, permissões e acesso dos usuários."}
              {activeTab === "sessions" && "Monitore e revogue sessões ativas em tempo real."}
            </p>
          </div>

          {/* Conteúdo da aba */}
          {activeTab === "overview"  && <AdminOverview />}
          {activeTab === "users"     && <UsersManager />}
          {activeTab === "sessions"  && <SessionsManager />}
        </main>
      </div>
    </div>
  );
}
