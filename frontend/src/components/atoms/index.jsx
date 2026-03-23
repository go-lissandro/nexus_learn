/**
 * NexusLearn — Atoms
 * Componentes reutilizáveis de menor granularidade.
 */

// ─── Button ───────────────────────────────────────────────
export function Button({ children, variant = "primary", size = "md", loading, disabled, onClick, className = "", type = "button" }) {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    danger:  "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost:   "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300",
    warning: "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs gap-1.5", md: "px-4 py-2 text-sm gap-2", lg: "px-6 py-2.5 text-base gap-2" };
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner size="sm" color="white" />}
      {children}
    </button>
  );
}

// ─── Spinner ──────────────────────────────────────────────
export function Spinner({ size = "md", color = "indigo" }) {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };
  const colors = { indigo: "border-indigo-600", white: "border-white", gray: "border-gray-400" };
  return (
    <div className={`${sizes[size]} border-2 ${colors[color]} border-t-transparent rounded-full animate-spin`} />
  );
}

// ─── StatusBadge ──────────────────────────────────────────
export function StatusBadge({ active, labels = ["Ativo", "Inativo"] }) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{labels[0]}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{labels[1]}
    </span>
  );
}

// ─── RoleBadge ────────────────────────────────────────────
export function RoleBadge({ isAdmin }) {
  return isAdmin ? (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Admin</span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Usuário</span>
  );
}

// ─── Avatar ───────────────────────────────────────────────
export function Avatar({ name = "?", size = "md" }) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" };
  const colors = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────
export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────
export function StatCard({ label, value, delta, color = "indigo" }) {
  const colors = {
    indigo: "text-indigo-600 bg-indigo-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    red: "text-red-600 bg-red-50",
  };
  return (
    <Card className="p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colors[color].split(" ")[0]}`}>{value}</p>
      {delta && <p className="text-xs text-gray-400 mt-1">{delta}</p>}
    </Card>
  );
}

// ─── EmptyState ───────────────────────────────────────────
export function EmptyState({ message = "Nenhum item encontrado." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── formatDate ───────────────────────────────────────────
export function formatDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}
