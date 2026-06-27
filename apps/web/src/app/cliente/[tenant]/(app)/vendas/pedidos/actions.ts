"use server";

import { revalidatePath } from "next/cache";
import { db, SalesOrderStatus, AccountType, MovementType, BillStatus } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

export interface SalesItemPayload {
  productId: string;
  productName: string;
  productUnit: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  totalPrice: number;
}

export interface SalesOrderPayload {
  clientId?: string;
  clientName: string;
  issueDate: string;
  deliveryDate?: string;
  notes?: string;
  items: SalesItemPayload[];
  subtotal: number;
  discountTotal: number;
  total: number;
}

export interface FaturarPayload {
  orderId: string;
  warehouseId: string;
  dueDate: string;
}

export async function criarPedido(tenantSlug: string, payload: SalesOrderPayload) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    const count = await db.salesOrder.count({ where: { tenantId } });
    const number = `VDA-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    await db.salesOrder.create({
      data: {
        tenantId,
        clientId: payload.clientId || null,
        clientName: payload.clientName,
        number,
        issueDate: new Date(payload.issueDate),
        deliveryDate: payload.deliveryDate ? new Date(payload.deliveryDate) : null,
        subtotal: payload.subtotal,
        discountTotal: payload.discountTotal,
        total: payload.total,
        notes: payload.notes || null,
        items: {
          create: payload.items.map((i: SalesItemPayload) => ({
            productId: i.productId,
            productName: i.productName,
            productUnit: i.productUnit,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountPct: i.discountPct,
            totalPrice: i.totalPrice,
          })),
        },
      },
    });

    revalidatePath("/", "layout");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao salvar pedido. Tente novamente.');
  }
}

export async function confirmarPedido(tenantSlug: string, id: string) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.salesOrder.update({
      where: { id, tenantId, status: SalesOrderStatus.DRAFT },
      data: { status: SalesOrderStatus.CONFIRMED },
    });
    revalidatePath("/", "layout");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao confirmar pedido. Tente novamente.');
  }
}

export async function faturarPedido(tenantSlug: string, payload: FaturarPayload) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    const order = await db.salesOrder.findUnique({
      where: { id: payload.orderId, tenantId },
      include: { items: true },
    });
    if (!order) throw new Error("Pedido não encontrado");
    if (order.status === SalesOrderStatus.INVOICED) throw new Error("Pedido já faturado");

    await db.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: payload.warehouseId,
            accountType: AccountType.ESTOQUE,
            movementType: MovementType.SAIDA,
            quantity: Number(item.quantity),
            notes: `Faturamento ${order.number}`,
          },
        });

        await tx.stockBalance.upsert({
          where: {
            tenantId_productId_warehouseId_accountType: {
              tenantId,
              productId: item.productId,
              warehouseId: payload.warehouseId,
              accountType: AccountType.ESTOQUE,
            },
          },
          create: {
            tenantId,
            productId: item.productId,
            warehouseId: payload.warehouseId,
            accountType: AccountType.ESTOQUE,
            quantity: -Number(item.quantity),
          },
          update: { quantity: { decrement: Number(item.quantity) } },
        });
      }

      await tx.accountsReceivable.create({
        data: {
          tenantId,
          clientId: order.clientId,
          clientName: order.clientName,
          description: `Pedido ${order.number}`,
          amount: Number(order.total),
          dueDate: new Date(payload.dueDate),
          status: BillStatus.PENDING,
        },
      });

      await tx.salesOrder.update({
        where: { id: payload.orderId },
        data: { status: SalesOrderStatus.INVOICED },
      });
    });

    revalidatePath("/", "layout");
    revalidatePath("/", "layout");
    revalidatePath("/", "layout");
  } catch (e) {
    console.error('DB Error:', e);
    if (e instanceof Error && ["Pedido não encontrado", "Pedido já faturado"].includes(e.message)) throw e;
    throw new Error('Erro ao faturar pedido. Tente novamente.');
  }
}

export async function cancelarPedido(tenantSlug: string, id: string) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.salesOrder.update({
      where: { id, tenantId },
      data: { status: SalesOrderStatus.CANCELLED },
    });
    revalidatePath("/", "layout");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao cancelar pedido. Tente novamente.');
  }
}
