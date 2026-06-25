"use server";

import { revalidatePath } from "next/cache";
import { db, AccountType, MovementType } from "@facin/db";
import { getTenantId } from "@/lib/tenant";

export interface MovimentacaoPayload {
  productId: string;
  warehouseId: string;
  accountType: AccountType;
  movementType: MovementType;
  quantity: number;
  lot?: string;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  notes?: string;
}

export async function registrarMovimentacao(payload: MovimentacaoPayload) {
  const tenantId = getTenantId();

  await db.stockMovement.create({
    data: {
      tenantId,
      productId: payload.productId,
      warehouseId: payload.warehouseId,
      accountType: payload.accountType,
      movementType: payload.movementType,
      quantity: payload.quantity,
      lot: payload.lot || null,
      manufacturingDate: payload.manufacturingDate ? new Date(payload.manufacturingDate) : null,
      expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
      notes: payload.notes || null,
    },
  });

  const delta = payload.movementType === MovementType.ENTRADA ? payload.quantity : -payload.quantity;

  // Upsert saldo — quantidade pode ficar negativa (implantação com histórico incompleto)
  await db.stockBalance.upsert({
    where: {
      tenantId_productId_warehouseId_accountType: {
        tenantId,
        productId: payload.productId,
        warehouseId: payload.warehouseId,
        accountType: payload.accountType,
      },
    },
    create: {
      tenantId,
      productId: payload.productId,
      warehouseId: payload.warehouseId,
      accountType: payload.accountType,
      quantity: delta,
      expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
    },
    update: {
      quantity: { increment: delta },
      // Atualiza validade apenas em entradas (saídas não alteram a validade do saldo)
      ...(payload.movementType === MovementType.ENTRADA && payload.expiryDate
        ? { expiryDate: new Date(payload.expiryDate) }
        : {}),
    },
  });

  revalidatePath("/estoque");
  revalidatePath("/estoque/movimentacao");
}
