export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { CotacoesView } from "./cotacoes-view";

export default async function CotacoesPage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let quotes: any[] = [];
  let fornecedores: any[] = [];
  let produtos: any[] = [];
  try {
    const [rawQuotes, forn, prods] = await Promise.all([
      db.purchaseQuote.findMany({
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
    ]);

    quotes = rawQuotes.map((q) => ({
      id: q.id,
      number: q.number,
      supplierName: q.supplierName,
      issueDate: q.issueDate.toISOString(),
      expectedDate: q.expectedDate?.toISOString() ?? null,
      paymentTerms: q.paymentTerms,
      status: q.status,
      totalAmount: Number(q.totalAmount),
      itemCount: q.items.length,
      items: q.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.descricao,
        productUnit: i.product.unidade,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
        totalCost: Number(i.totalCost),
      })),
    }));
    fornecedores = forn;
    produtos = prods;
  } catch (e) {
    console.error('DB Error:', e);
  }

  return <CotacoesView quotes={quotes} fornecedores={fornecedores} produtos={produtos} tenantSlug={params.tenant} />;
}
