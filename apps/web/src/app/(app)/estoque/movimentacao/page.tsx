import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";
import { MovimentacaoView } from "./movimentacao-view";

export default async function MovimentacaoPage() {
  const tenantId = getTenantId();

  const [rawMovements, produtos, depositos] = await Promise.all([
    db.stockMovement.findMany({
      where: { tenantId },
      include: {
        product: { select: { codigo: true, descricao: true, unidade: true } },
        warehouse: { select: { nome: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
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
  ]);

  const movements = rawMovements.map((m) => ({
    id: m.id,
    productCode: m.product.codigo,
    productName: m.product.descricao,
    productUnit: m.product.unidade,
    warehouseName: m.warehouse.nome,
    accountType: m.accountType,
    movementType: m.movementType,
    quantity: Number(m.quantity),
    lot: m.lot,
    expiryDate: m.expiryDate?.toISOString() ?? null,
    notes: m.notes,
    createdAt: m.createdAt.toISOString(),
  }));

  return <MovimentacaoView movements={movements} produtos={produtos} depositos={depositos} />;
}
