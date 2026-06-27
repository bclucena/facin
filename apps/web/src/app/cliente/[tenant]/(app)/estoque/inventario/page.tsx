export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { InventarioView } from "./inventario-view";

export default async function InventarioPage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let depositos: any[] = [];
  let produtos: any[] = [];
  let balances: any[] = [];
  try {
    const [deps, prods, rawBalances] = await Promise.all([
      db.deposito.findMany({ where: { tenantId, ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
      db.produto.findMany({ where: { tenantId, ativo: true }, orderBy: { descricao: "asc" }, select: { id: true, codigo: true, descricao: true, unidade: true } }),
      db.stockBalance.findMany({ where: { tenantId }, select: { productId: true, warehouseId: true, accountType: true, quantity: true } }),
    ]);

    depositos = deps;
    produtos = prods;
    balances = rawBalances.map((b) => ({
      productId: b.productId,
      warehouseId: b.warehouseId,
      accountType: b.accountType,
      quantity: Number(b.quantity),
    }));
  } catch (e) {
    console.error('DB Error:', e);
  }

  return <InventarioView depositos={depositos} produtos={produtos} balances={balances} />;
}
