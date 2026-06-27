export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { PedidosView } from "./pedidos-view";

export default async function PedidosPage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let orders: any[] = [];
  let depositos: any[] = [];
  try {
    const [rawOrders, deps] = await Promise.all([
      db.salesOrder.findMany({
        where: { tenantId },
        include: { items: { select: { id: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.deposito.findMany({
        where: { tenantId, ativo: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      }),
    ]);

    orders = rawOrders.map((o) => ({
      id: o.id,
      number: o.number,
      clientName: o.clientName,
      issueDate: o.issueDate.toISOString(),
      deliveryDate: o.deliveryDate?.toISOString() ?? null,
      status: o.status,
      subtotal: Number(o.subtotal),
      discountTotal: Number(o.discountTotal),
      total: Number(o.total),
      itemCount: o.items.length,
      notes: o.notes,
    }));
    depositos = deps;
  } catch (e) {
    console.error('DB Error:', e);
  }

  return <PedidosView orders={orders} depositos={depositos} />;
}
