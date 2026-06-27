export const dynamic = 'force-dynamic'

import { db, BillStatus, CashFlowType } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 86_400_000);
}

export default async function DashboardPage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  const firstName = "Usuário";

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);
  const in7Days = addDays(todayStart, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  let caixaHoje = 0;
  let receivableAmount = 0;
  let receivableCount = 0;
  let payable7dAmount = 0;
  let payable7dCount = 0;
  let estoquesCriticos = 0;
  let topProducts: { productId: string; name: string; qty: number; revenue: number }[] = [];
  let topClients: { clientName: string; revenue: number; orderCount: number }[] = [];
  let thisMonthCount = 0;
  let thisMonthTotal = 0;
  let prevMonthCount = 0;
  let prevMonthTotal = 0;

  try {
    const [cashToday, receivable, payable7d, criticalStock, invoicedThisMonth, prevMonthAgg] = await Promise.all([
      db.cashFlow.findMany({
        where: { tenantId, referenceDate: { gte: todayStart, lt: todayEnd } },
        select: { type: true, amount: true },
      }),
      db.accountsReceivable.aggregate({
        where: { tenantId, status: BillStatus.PENDING },
        _sum: { amount: true },
        _count: { id: true },
      }),
      db.accountsPayable.aggregate({
        where: { tenantId, status: BillStatus.PENDING, dueDate: { lte: in7Days } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      db.stockBalance.groupBy({
        by: ["productId"],
        where: { tenantId },
        _sum: { quantity: true },
      }),
      db.salesOrder.findMany({
        where: { tenantId, status: "INVOICED", issueDate: { gte: monthStart, lte: monthEnd } },
        include: {
          items: { select: { productId: true, productName: true, quantity: true, totalPrice: true } },
        },
      }),
      db.salesOrder.aggregate({
        where: { tenantId, status: "INVOICED", issueDate: { gte: prevMonthStart, lte: prevMonthEnd } },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    caixaHoje = cashToday.reduce((s, e) => {
      return s + (e.type === CashFlowType.CREDIT ? Number(e.amount) : -Number(e.amount));
    }, 0);

    receivableAmount = Number(receivable._sum.amount ?? 0);
    receivableCount = receivable._count.id;
    payable7dAmount = Number(payable7d._sum.amount ?? 0);
    payable7dCount = payable7d._count.id;

    const productIds = criticalStock.map((r) => r.productId);
    const produtosMinimo = productIds.length > 0
      ? await db.produto.findMany({
          where: { id: { in: productIds }, tenantId },
          select: { id: true, estoqueMinimo: true },
        })
      : [];
    const minimoMap = Object.fromEntries(produtosMinimo.map((p) => [p.id, Number(p.estoqueMinimo)]));
    estoquesCriticos = criticalStock.filter(
      (r) => Number(r._sum.quantity ?? 0) <= (minimoMap[r.productId] ?? 0)
    ).length;

    // Top products by qty in invoiced orders this month
    const prodMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const order of invoicedThisMonth) {
      for (const item of order.items) {
        const existing = prodMap.get(item.productId) ?? { name: item.productName, qty: 0, revenue: 0 };
        existing.qty += Number(item.quantity);
        existing.revenue += Number(item.totalPrice);
        prodMap.set(item.productId, existing);
      }
    }
    topProducts = [...prodMap.entries()]
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Top clients by revenue
    const clientMap = new Map<string, { revenue: number; orderCount: number }>();
    for (const order of invoicedThisMonth) {
      const existing = clientMap.get(order.clientName) ?? { revenue: 0, orderCount: 0 };
      existing.revenue += Number(order.total);
      existing.orderCount += 1;
      clientMap.set(order.clientName, existing);
    }
    topClients = [...clientMap.entries()]
      .map(([clientName, v]) => ({ clientName, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Month comparison
    thisMonthCount = invoicedThisMonth.length;
    thisMonthTotal = invoicedThisMonth.reduce((s, o) => s + Number(o.total), 0);
    prevMonthCount = prevMonthAgg._count.id;
    prevMonthTotal = Number(prevMonthAgg._sum.total ?? 0);
  } catch (e) {
    console.error('DB Error:', e);
  }

  const kpiCards = [
    {
      label: "Caixa hoje",
      value: fmt(caixaHoje),
      badge: caixaHoje >= 0 ? "Saldo positivo" : "Saldo negativo",
      badgeClass: caixaHoje >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
    },
    {
      label: "A receber",
      value: fmt(receivableAmount),
      badge: `${receivableCount} título${receivableCount !== 1 ? "s" : ""}`,
      badgeClass: "bg-blue-50 text-blue-700",
    },
    {
      label: "A pagar 7d",
      value: fmt(payable7dAmount),
      badge: `${payable7dCount} vencendo em breve`,
      badgeClass: "bg-amber-50 text-amber-700",
    },
    {
      label: "Estoque crítico",
      value: `${estoquesCriticos} item${estoquesCriticos !== 1 ? "s" : ""}`,
      badge: "Abaixo do mínimo",
      badgeClass: estoquesCriticos > 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500",
    },
  ];

  const countDiff = thisMonthCount - prevMonthCount;
  const totalDiff = thisMonthTotal - prevMonthTotal;
  const totalDiffPct = prevMonthTotal > 0 ? ((totalDiff / prevMonthTotal) * 100).toFixed(1) : null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bom dia, {firstName}!</h1>
        <p className="text-sm text-gray-500 mt-1">Aqui está um resumo do seu negócio hoje.</p>
      </div>

      {/* KPI cards */}
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

      {/* Vendas do mês */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Vendas do mês</h2>

        {/* Comparativo mês atual vs anterior */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Pedidos faturados</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{thisMonthCount}</p>
            <p className="mt-2 text-xs text-gray-500">
              Mês anterior: <span className="font-medium text-gray-700">{prevMonthCount}</span>
              {countDiff !== 0 && (
                <span className={`ml-2 font-semibold ${countDiff > 0 ? "text-green-600" : "text-red-600"}`}>
                  {countDiff > 0 ? "+" : ""}{countDiff}
                </span>
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Receita faturada</p>
            <p className="text-2xl font-bold text-green-700 mt-2">{fmt(thisMonthTotal)}</p>
            <p className="mt-2 text-xs text-gray-500">
              Mês anterior: <span className="font-medium text-gray-700">{fmt(prevMonthTotal)}</span>
              {totalDiffPct !== null && (
                <span className={`ml-2 font-semibold ${totalDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {totalDiff >= 0 ? "+" : ""}{totalDiffPct}%
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Top 5 produtos */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">Top 5 Produtos</p>
              <p className="text-xs text-gray-400 mt-0.5">Por quantidade vendida — pedidos faturados do mês</p>
            </div>
            {topProducts.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">Sem pedidos faturados este mês.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {topProducts.map((p, i) => (
                  <div key={p.productId} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xs font-bold text-gray-300 w-5 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold tabular-nums text-gray-900">
                        {p.qty.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} un.
                      </p>
                      <p className="text-xs text-gray-400 tabular-nums">{fmt(p.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 5 clientes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">Top 5 Clientes</p>
              <p className="text-xs text-gray-400 mt-0.5">Por receita — pedidos faturados do mês</p>
            </div>
            {topClients.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">Sem pedidos faturados este mês.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {topClients.map((c, i) => (
                  <div key={c.clientName} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xs font-bold text-gray-300 w-5 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.clientName}</p>
                      <p className="text-xs text-gray-400">{c.orderCount} pedido{c.orderCount !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold tabular-nums text-green-700">{fmt(c.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
