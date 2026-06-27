"use server";

import { revalidatePath } from "next/cache";
import { db, QuoteStatus, OrderStatus, type PurchaseQuoteItem } from "@facin/db";
import { getTenantId } from "@/lib/tenant";

export interface QuoteItemPayload {
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface QuotePayload {
  supplierId: string;
  supplierName: string;
  issueDate: string;
  expectedDate?: string;
  paymentTerms?: string;
  items: QuoteItemPayload[];
  totalAmount: number;
}

export async function criarCotacao(payload: QuotePayload) {
  const tenantId = getTenantId();
  try {
    const count = await db.purchaseQuote.count({ where: { tenantId } });
    const number = `COT-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    await db.purchaseQuote.create({
      data: {
        tenantId,
        supplierId: payload.supplierId,
        supplierName: payload.supplierName,
        number,
        issueDate: new Date(payload.issueDate),
        expectedDate: payload.expectedDate ? new Date(payload.expectedDate) : null,
        paymentTerms: payload.paymentTerms || null,
        totalAmount: payload.totalAmount,
        items: {
          create: payload.items.map((i: QuoteItemPayload) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            totalCost: i.totalCost,
          })),
        },
      },
    });

    revalidatePath("/compras/cotacoes");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao salvar cotação. Tente novamente.');
  }
}

export async function atualizarStatusCotacao(id: string, status: QuoteStatus) {
  const tenantId = getTenantId();
  try {
    await db.purchaseQuote.update({ where: { id, tenantId }, data: { status } });
    revalidatePath("/compras/cotacoes");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao atualizar cotação. Tente novamente.');
  }
}

export async function excluirCotacao(id: string) {
  const tenantId = getTenantId();
  try {
    await db.purchaseQuote.delete({ where: { id, tenantId } });
    revalidatePath("/compras/cotacoes");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao excluir cotação. Tente novamente.');
  }
}

export async function converterParaOC(quoteId: string) {
  const tenantId = getTenantId();
  try {
    const quote = await db.purchaseQuote.findUnique({
      where: { id: quoteId, tenantId },
      include: { items: true },
    });
    if (!quote) throw new Error("Cotação não encontrada");

    const count = await db.purchaseOrder.count({ where: { tenantId } });
    const number = `OC-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    await db.$transaction([
      db.purchaseOrder.create({
        data: {
          tenantId,
          supplierId: quote.supplierId,
          supplierName: quote.supplierName,
          quoteId: quote.id,
          number,
          issueDate: new Date(),
          expectedDate: quote.expectedDate,
          paymentTerms: quote.paymentTerms,
          totalAmount: quote.totalAmount,
          items: {
            create: quote.items.map((i: PurchaseQuoteItem) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitCost: i.unitCost,
              totalCost: i.totalCost,
              receivedQty: 0,
            })),
          },
        },
      }),
      db.purchaseQuote.update({
        where: { id: quoteId },
        data: { status: QuoteStatus.CONVERTED },
      }),
    ]);

    revalidatePath("/compras/cotacoes");
    revalidatePath("/compras/ordens");
  } catch (e) {
    console.error('DB Error:', e);
    if (e instanceof Error && e.message === "Cotação não encontrada") throw e;
    throw new Error('Erro ao converter cotação. Tente novamente.');
  }
}
