export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { ContasReceberView } from "./contas-receber-view";

export default async function ContasReceberPage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let bills: any[] = [];
  let clientes: any[] = [];
  try {
    const [rawBills, cls] = await Promise.all([
      db.accountsReceivable.findMany({
        where: { tenantId },
        orderBy: { dueDate: "asc" },
      }),
      db.cliente.findMany({
        where: { tenantId, ativo: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      }),
    ]);

    bills = rawBills.map((b) => ({
      id: b.id,
      clientName: b.clientName,
      description: b.description,
      amount: Number(b.amount),
      dueDate: b.dueDate.toISOString(),
      receivedAt: b.receivedAt?.toISOString() ?? null,
      receivedAmount: b.receivedAmount ? Number(b.receivedAmount) : null,
      paymentType: b.paymentType,
      status: b.status,
      notes: b.notes,
    }));
    clientes = cls;
  } catch (e) {
    console.error('DB Error:', e);
  }

  return <ContasReceberView bills={bills} clientes={clientes} />;
}
