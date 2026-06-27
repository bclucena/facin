export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { OrdensView } from "./ordens-view";

export default async function OrdensPage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let orders: any[] = [];
  let fornecedores: any[] = [];
  let produtos: any[] = [];
  let depositos: any[] = [];
  let quotes: any[] = [];
  try {
    const [rawOrders, forn, prods, deps, rawQuotes] = await Promise.all([
      db.purchaseOrder.findMany({
        where: { tenantId },
        include: {
          items: { include: { product: { select: { descricao: true, unidade: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.fornecedor.findMany({
        where: { tenantId, ativo: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      }),
      db.produto.findMany({
        where: { tenantId, ativo: true },
        orderBy: { descricao: "asc" },
        select: { id: true, codigo: true, descricao: true, unidade: true },
      }),
      db.deposito.findMany({
        where: { tenantId, ativo: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      }),
      db.purchaseQuote.findMany({
        where: { tenantId },
        orderBy: { number: "asc" },
        select: { id: true, number: true, supplierName: true },
      }),
    ]);

    orders = rawOrders.map((o) => ({
      id: o.id,
      number: o.number,
      supplierName: o.supplierName,
      supplierId: o.supplierId,
      issueDate: o.issueDate.toISOString(),
      expectedDate: o.expectedDate?.toISOString() ?? null,
      paymentTerms: o.paymentTerms,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      nfNumber: o.nfNumber,
      nfDate: o.nfDate?.toISOString() ?? null,
      nfAmount: o.nfAmount ? Number(o.nfAmount) : null,
      quoteId: o.quoteId,
      items: o.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.descricao,
        productUnit: i.product.unidade,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
        totalCost: Number(i.totalCost),
        receivedQty: Number(i.receivedQty),
      })),
    }));
    fornecedores = forn;
    produtos = prods;
    depositos = deps;
    quotes = rawQuotes;
  } catch (e) {
    console.error('DB Error:', e);
  }

  return (
    <OrdensView
      orders={orders}
      fornecedores={fornecedores}
      produtos={produtos}
      depositos={depositos}
      quotes={quotes}
    />
  );
}
