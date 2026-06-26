export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";
import { FluxoView } from "./fluxo-view";

export default async function FluxoDeCaixaPage() {
  const tenantId = getTenantId();

  // Mês atual por padrão
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const rawEntries = await db.cashFlow.findMany({
    where: { tenantId, referenceDate: { gte: start, lte: end } },
    orderBy: { referenceDate: "asc" },
  });

  const entries = rawEntries.map((e) => ({
    id: e.id,
    description: e.description,
    amount: Number(e.amount),
    type: e.type as "CREDIT" | "DEBIT",
    accountCode: e.accountCode,
    referenceDate: e.referenceDate.toISOString(),
    createdAt: e.createdAt.toISOString(),
  }));

  return <FluxoView entries={entries} defaultMonth={start.toISOString().slice(0, 7)} />;
}