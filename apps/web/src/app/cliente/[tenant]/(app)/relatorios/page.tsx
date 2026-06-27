export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { RelatoriosView } from "./relatorios-view";

function parseDate(str: string | undefined, fallback: Date): Date {
  if (!str) return fallback;
  const d = new Date(str + "T00:00:00");
  return isNaN(d.getTime()) ? fallback : d;
}

export default async function RelatoriosPage({
  params,
  searchParams,
}: {
  params: { tenant: string };
  searchParams: { from?: string; to?: string };
}) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const from = parseDate(searchParams.from, defaultFrom);
  const to = parseDate(searchParams.to, defaultTo);
  const toEOD = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);

  let cashFlows: any[] = [];
  let stockBalances: any[] = [];
  let salesOrders: any[] = [];
  let overdueAR: any[] = [];

  try {
    const [cfRaw, sbRaw, soRaw, arRaw] = await Promise.all([
      db.cashFlow.findMany({
        where: { tenantId, referenceDate: { gte: from, lte: toEOD } },
        orderBy: { referenceDate: "asc" },
      }),
      db.stockBalance.findMany({
        where: { tenantId },
        include: {
          product: { select: { codigo: true, descricao: true, unidade: true, estoqueMinimo: true } },
          warehouse: { select: { nome: true } },
        },
        orderBy: [{ warehouse: { nome: "asc" } }, { product: { descricao: "asc" } }],
      }),
      db.salesOrder.findMany({
        where: { tenantId, issueDate: { gte: from, lte: toEOD } },
        include: { items: { select: { id: true } } },
        orderBy: { issueDate: "desc" },
      }),
      db.accountsReceivable.findMany({
        where: { tenantId, status: "PENDING", dueDate: { lt: now } },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    cashFlows = cfRaw.map((e) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      type: e.type,
      accountCode: e.accountCode ?? "",
      referenceDate: e.referenceDate.toISOString(),
    }));

    stockBalances = sbRaw.map((b) => ({
      id: b.id,
      productCode: b.product.codigo,
      productName: b.product.descricao,
      productUnit: b.product.unidade,
      productMinStock: Number(b.product.estoqueMinimo),
      warehouseName: b.warehouse.nome,
      accountType: b.accountType,
      quantity: Number(b.quantity),
      qtyCommitted: Number(b.qtyCommitted),
      qtyAvailable: Number(b.quantity) - Number(b.qtyCommitted),
    }));

    salesOrders = soRaw.map((o) => ({
      id: o.id,
      number: o.number,
      clientName: o.clientName,
      issueDate: o.issueDate.toISOString(),
      status: o.status,
      itemCount: o.items.length,
      total: Number(o.total),
    }));

    const nowMs = now.getTime();
    overdueAR = arRaw.map((ar) => {
      const daysOverdue = Math.floor((nowMs - ar.dueDate.getTime()) / 86_400_000);
      return {
        id: ar.id,
        clientName: ar.clientName,
        description: ar.description,
        amount: Number(ar.amount),
        dueDate: ar.dueDate.toISOString(),
        daysOverdue,
      };
    });
  } catch (e) {
    console.error("DB Error:", e);
  }

  return (
    <RelatoriosView
      tenantSlug={params.tenant}
      from={from.toISOString().slice(0, 10)}
      to={to.toISOString().slice(0, 10)}
      cashFlows={cashFlows}
      stockBalances={stockBalances}
      salesOrders={salesOrders}
      overdueAR={overdueAR}
    />
  );
}
