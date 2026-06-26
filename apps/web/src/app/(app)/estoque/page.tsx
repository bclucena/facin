export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";
import { EstoqueView } from "./estoque-view";

export default async function EstoquePage() {
  const tenantId = getTenantId();

  const raw = await db.stockBalance.findMany({
    where: { tenantId },
    include: {
      product: { select: { id: true, codigo: true, descricao: true, unidade: true, estoqueMinimo: true } },
      warehouse: { select: { id: true, nome: true } },
    },
    orderBy: [{ warehouse: { nome: "asc" } }, { product: { descricao: "asc" } }],
  });

  const balances = raw.map((b) => ({
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

  const depositos = await db.deposito.findMany({
    where: { tenantId, ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return <EstoqueView balances={balances} depositos={depositos} />;
}