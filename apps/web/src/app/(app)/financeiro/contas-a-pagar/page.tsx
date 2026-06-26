export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";
import { ContasPagarView } from "./contas-pagar-view";

export default async function ContasPagarPage() {
  const tenantId = getTenantId();

  const [rawBills, fornecedores] = await Promise.all([
    db.accountsPayable.findMany({
      where: { tenantId },
      orderBy: { dueDate: "asc" },
    }),
    db.fornecedor.findMany({
      where: { tenantId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const bills = rawBills.map((b) => ({
    id: b.id,
    supplierName: b.supplierName,
    description: b.description,
    amount: Number(b.amount),
    dueDate: b.dueDate.toISOString(),
    paidAt: b.paidAt?.toISOString() ?? null,
    paidAmount: b.paidAmount ? Number(b.paidAmount) : null,
    paymentType: b.paymentType,
    status: b.status,
    notes: b.notes,
  }));

  return <ContasPagarView bills={bills} fornecedores={fornecedores} />;
}