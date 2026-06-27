"use server";

import { revalidatePath } from "next/cache";
import { db, AccountType, MovementType, OrderStatus } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

export interface OrderItemPayload {
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface OrderPayload {
  supplierId: string;
  supplierName: string;
  quoteId?: string;
  issueDate: string;
  expectedDate?: string;
  paymentTerms?: string;
  items: OrderItemPayload[];
  totalAmount: number;
}

export interface ReceberNFPayload {
  orderId: string;
  nfNumber: string;
  nfDate: string;
  nfAmount: number;
  warehouseId: string;
  items: Array<{ itemId: string; productId: string; receivedQty: number; unitCost: number }>;
  dueDate: string;
}

export async function criarOrdem(tenantSlug: string, payload: OrderPayload) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    const count = await db.purchaseOrder.count({ where: { tenantId } });
    const number = `OC-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    await db.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: payload.supplierId,
        supplierName: payload.supplierName,
        quoteId: payload.quoteId || null,
        number,
        issueDate: new Date(payload.issueDate),
        expectedDate: payload.expectedDate ? new Date(payload.expectedDate) : null,
        paymentTerms: payload.paymentTerms || null,
        totalAmount: payload.totalAmount,
        items: {
          create: payload.items.map((i: OrderItemPayload) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            totalCost: i.totalCost,
            receivedQty: 0,
          })),
        },
      },
    });

    revalidatePath("/", "layout");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao salvar ordem. Tente novamente.');
  }
}

export async function excluirOrdem(tenantSlug: string, id: string) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.purchaseOrder.delete({ where: { id, tenantId } });
    revalidatePath("/", "layout");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao excluir ordem. Tente novamente.');
  }
}

export async function receberNF(tenantSlug: string, payload: ReceberNFPayload) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    const order = await db.purchaseOrder.findUnique({
      where: { id: payload.orderId, tenantId },
    });
    if (!order) throw new Error("Ordem não encontrada");

    await db.$transaction(async (tx) => {
      for (const item of payload.items) {
        if (item.receivedQty <= 0) continue;

        await tx.purchaseOrderItem.update({
          where: { id: item.itemId },
          data: { receivedQty: item.receivedQty },
        });

        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: payload.warehouseId,
            accountType: AccountType.ESTOQUE_NF,
            movementType: MovementType.ENTRADA,
            quantity: item.receivedQty,
            notes: `Recebimento NF ${payload.nfNumber} — ${order.number}`,
          },
        });

        await tx.stockBalance.upsert({
          where: {
            tenantId_productId_warehouseId_accountType: {
              tenantId,
              productId: item.productId,
              warehouseId: payload.warehouseId,
              accountType: AccountType.ESTOQUE_NF,
            },
          },
          create: {
            tenantId,
            productId: item.productId,
            warehouseId: payload.warehouseId,
            accountType: AccountType.ESTOQUE_NF,
            quantity: item.receivedQty,
          },
          update: { quantity: { increment: item.receivedQty } },
        });
      }

      await tx.accountsPayable.create({
        data: {
          tenantId,
          supplierId: order.supplierId,
          supplierName: order.supplierName,
          description: `NF ${payload.nfNumber} — ${order.number}`,
          amount: payload.nfAmount,
          dueDate: new Date(payload.dueDate),
        },
      });

      await tx.purchaseOrder.update({
        where: { id: payload.orderId },
        data: {
          status: OrderStatus.RECEIVED,
          nfNumber: payload.nfNumber,
          nfDate: new Date(payload.nfDate),
          nfAmount: payload.nfAmount,
        },
      });
    });

    revalidatePath("/", "layout");
    revalidatePath("/", "layout");
    revalidatePath("/", "layout");
  } catch (e) {
    console.error('DB Error:', e);
    if (e instanceof Error && e.message === "Ordem não encontrada") throw e;
    throw new Error('Erro ao receber NF. Tente novamente.');
  }
}
