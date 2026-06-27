"use server";

import { revalidatePath } from "next/cache";
import { db, AccountType, MovementType } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

export interface InventarioItem {
  productId: string;
  systemQty: number;
  countedQty: number;
}

export async function confirmarInventario(tenantSlug: string, payload: {
  warehouseId: string;
  accountType: AccountType;
  items: InventarioItem[];
}) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    const count = await db.inventoryCount.create({
      data: {
        tenantId,
        warehouseId: payload.warehouseId,
        accountType: payload.accountType,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    for (const item of payload.items) {
      await db.inventoryCountItem.create({
        data: {
          inventoryCountId: count.id,
          productId: item.productId,
          systemQty: item.systemQty,
          countedQty: item.countedQty,
        },
      });

      await db.stockBalance.upsert({
        where: {
          tenantId_productId_warehouseId_accountType: {
            tenantId,
            productId: item.productId,
            warehouseId: payload.warehouseId,
            accountType: payload.accountType,
          },
        },
        create: {
          tenantId,
          productId: item.productId,
          warehouseId: payload.warehouseId,
          accountType: payload.accountType,
          quantity: item.countedQty,
        },
        update: { quantity: item.countedQty },
      });

      const diff = item.countedQty - item.systemQty;
      if (diff !== 0) {
        // Cria movimentação de ajuste para rastreabilidade
        await db.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: payload.warehouseId,
            accountType: payload.accountType,
            movementType: diff > 0 ? MovementType.ENTRADA : MovementType.SAIDA,
            quantity: Math.abs(diff),
            notes: `Ajuste de inventário #${count.id.slice(-6)}`,
          },
        });
      }
    }

    revalidatePath("/", "layout");
    revalidatePath("/", "layout");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao confirmar inventário. Tente novamente.');
  }
}
