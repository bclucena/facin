import { currentUser } from "@clerk/nextjs/server";

const kpiCards = [
  {
    label: "Caixa hoje",
    value: "R$ 0,00",
    badge: "Atualizado agora",
    badgeClass: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "A receber",
    value: "R$ 0,00",
    badge: "0 títulos",
    badgeClass: "bg-blue-50 text-blue-700",
  },
  {
    label: "A pagar 7d",
    value: "R$ 0,00",
    badge: "Próximos 7 dias",
    badgeClass: "bg-amber-50 text-amber-700",
  },
  {
    label: "Estoque crítico",
    value: "0 itens",
    badge: "Abaixo do mínimo",
    badgeClass: "bg-red-50 text-red-700",
  },
];

export default async function DashboardPage() {
  const user = await currentUser().catch(() => null);
  const firstName = user?.firstName ?? "usuário";

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bom dia, {firstName}!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Aqui está um resumo do seu negócio hoje.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
            <span
              className={`mt-3 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${card.badgeClass}`}
            >
              {card.badge}
            </span>
          </div>
        ))}
      </div>

      {/* Placeholder for future widgets */}
      <div className="bg-white rounded-xl border border-gray-200 border-dashed p-12 text-center shadow-sm">
        <p className="text-gray-400 text-sm">
          Gráficos e relatórios aparecerão aqui em breve.
        </p>
      </div>
    </div>
  );
}
