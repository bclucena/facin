export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { EstoqueView } from "./estoque-view";

export default async function EstoquePage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let balances: any[] = [];
  let depositos: any[] = [];
  try {
    const [raw, deps] = await Promise.all([
      db.stockBalance.findMany({
        where: { tenantId },
        include: {
          product: { select: { id: true, codigo: true, descricao: true, unidade: true, estoqueMinimo: true } },
          warehouse: { select: { id: true, nome: true } },
        },
        orderBy: [{ warehouse: { nome: "asc" } }, { product: { descricao: "asc" } }],
      }),
      db.deposito.findMany({
        where: { tenantId, ativo: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      }),
    ]);

    balances = raw.map((b) => ({
      id: b.id,
      productId: b.productId,
      productCode: b.product.codigo,
      productName: b.product.descricao,
      productUnit: b.product.unidade,
      productMinStock: Number(b.product.estoqueMinimo),
      warehouseId: b.warehouseId,
      warehouseName: b.warehouse.nome,
      accountType: b.accountType,
      quantity: Number(b.quantity),
      qtyCommitted: Number(b.qtyCommitted),
      qtyAvailable: Number(b.quantity) - Number(b.qtyCommitted),
      expiryDate: b.expiryDate?.toISOString() ?? null,
    }));
    depositos = deps;
  } catch (e) {
    console.error('DB Error:', e);
  }

  return <EstoqueView balances={balances} depositos={depositos} />;
}
