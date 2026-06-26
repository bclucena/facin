export const dynamic = 'force-dynamic'

import { db, BillStatus, CashFlowType } from "@facin/db";
import { getTenantId } from "@/lib/tenant";

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 86_400_000);
}

export default async function DashboardPage() {
  const tenantId = getTenantId();
  const firstName = "Usuário";

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);
  const in7Days = addDays(todayStart, 7);

  const [cashToday, receivable, payable7d, criticalStock] = await Promise.all([
    // Caixa hoje: créditos - débitos do referenceDate = hoje
    db.cashFlow.findMany({
      where: {
        tenantId,
        referenceDate: { gte: todayStart, lt: todayEnd },
      },
      select: { type: true, amount: true },
    }),

    // A receber: títulos PENDING
    db.accountsReceivable.aggregate({
      where: { tenantId, status: BillStatus.PENDING },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // A pagar 7d: títulos PENDING vencendo até hoje+7
    db.accountsPayable.aggregate({
      where: {
        tenantId,
        status: BillStatus.PENDING,
        dueDate: { lte: in7Days },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // Estoque crítico: produtos onde soma dos saldos <= estoqueMinimo
    // Usamos groupBy para agregar saldos por produto
    db.stockBalance.groupBy({
      by: ["productId"],
      where: { tenantId },
      _sum: { quantity: true },
    }),
  ]);

  // Calcula saldo do dia (créditos - débitos)
  const caixaHoje = cashToday.reduce((s, e) => {
    return s + (e.type === CashFlowType.CREDIT ? Number(e.amount) : -Number(e.amount));
  }, 0);

  // Pega estoqueMinimo de cada produto que aparece no groupBy
  const productIds = criticalStock.map((r) => r.productId);
  const produtosMinimo = productIds.length > 0
    ? await db.produto.findMany({
        where: { id: { in: productIds }, tenantId },
        select: { id: true, estoqueMinimo: true },
      })
    : [];

  const minimoMap = Object.fromEntries(produtosMinimo.map((p) => [p.id, Number(p.estoqueMinimo)]));
  const estoquesCriticos = criticalStock.filter(
    (r) => Number(r._sum.quantity ?? 0) <= (minimoMap[r.productId] ?? 0)
  ).length;

  const kpiCards = [
    {
      label: "Caixa hoje",
      value: fmt(caixaHoje),
      badge: caixaHoje >= 0 ? "Saldo positivo" : "Saldo negativo",
      badgeClass: caixaHoje >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
    },
    {
      label: "A receber",
      value: fmt(Number(receivable._sum.amount ?? 0)),
      badge: `${receivable._count.id} título${receivable._count.id !== 1 ? "s" : ""}`,
      badgeClass: "bg-blue-50 text-blue-700",
    },
    {
      label: "A pagar 7d",
      value: fmt(Number(payable7d._sum.amount ?? 0)),
      badge: `${payable7d._count.id} vencendo em breve`,
      badgeClass: "bg-amber-50 text-amber-700",
    },
    {
      label: "Estoque crítico",
      value: `${estoquesCriticos} item${estoquesCriticos !== 1 ? "s" : ""}`,
      badge: "Abaixo do mínimo",
      badgeClass: estoquesCriticos > 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bom dia, {firstName}!</h1>
        <p className="text-sm text-gray-500 mt-1">Aqui está um resumo do seu negócio hoje.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
            <span className={`mt-3 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${card.badgeClass}`}>
              {card.badge}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 border-dashed p-12 text-center shadow-sm">
        <p className="text-gray-400 text-sm">Gráficos e relatórios aparecerão aqui em breve.</p>
      </div>
    </div>
  );
}