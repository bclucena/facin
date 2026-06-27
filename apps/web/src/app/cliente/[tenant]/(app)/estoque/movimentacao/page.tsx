export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { MovimentacaoView } from "./movimentacao-view";

export default async function MovimentacaoPage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let movements: any[] = [];
  let produtos: any[] = [];
  let depositos: any[] = [];
  try {
    const [rawMovements, prods, deps] = await Promise.all([
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

    movements = rawMovements.map((m) => ({
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
    produtos = prods;
    depositos = deps;
  } catch (e) {
    console.error('DB Error:', e);
  }

  return <MovimentacaoView movements={movements} produtos={produtos} depositos={depositos} />;
}
