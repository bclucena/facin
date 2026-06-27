"use server";

import { revalidatePath } from "next/cache";
import { db, PaymentType, BillStatus } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

export interface PayablePayload {
  supplierId?: string;
  supplierName: string;
  description: string;
  amount: number;
  dueDate: string;
  notes?: string;
}

export interface BaixaPayload {
  id: string;
  paidAt: string;
  paidAmount: number;
  paymentType: PaymentType;
}

export async function criarContaPagar(payload: PayablePayload) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    await db.accountsPayable.create({
      data: {
        tenantId,
        supplierId: payload.supplierId || null,
        supplierName: payload.supplierName,
        description: payload.description,
        amount: payload.amount,
        dueDate: new Date(payload.dueDate),
        notes: payload.notes || null,
      },
    });
    revalidatePath("/financeiro/contas-a-pagar");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao salvar conta. Tente novamente.');
  }
}

export async function editarContaPagar(id: string, payload: PayablePayload) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    await db.accountsPayable.update({
      where: { id, tenantId },
      data: {
        supplierId: payload.supplierId || null,
        supplierName: payload.supplierName,
        description: payload.description,
        amount: payload.amount,
        dueDate: new Date(payload.dueDate),
        notes: payload.notes || null,
      },
    });
    revalidatePath("/financeiro/contas-a-pagar");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao atualizar conta. Tente novamente.');
  }
}

export async function excluirContaPagar(id: string) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    await db.accountsPayable.delete({ where: { id, tenantId } });
    revalidatePath("/financeiro/contas-a-pagar");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao excluir conta. Tente novamente.');
  }
}

export async function registrarBaixaPagar(payload: BaixaPayload) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    await db.accountsPayable.update({
      where: { id: payload.id, tenantId },
      data: {
        status: BillStatus.PAID,
        paidAt: new Date(payload.paidAt),
        paidAmount: payload.paidAmount,
        paymentType: payload.paymentType,
      },
    });

    const bill = await db.accountsPayable.findUnique({
      where: { id: payload.id },
      select: { supplierName: true, description: true },
    });
    if (bill) {
      await db.cashFlow.create({
        data: {
          tenantId,
          description: `Pgto ${bill.supplierName} — ${bill.description}`,
          amount: payload.paidAmount,
          type: "DEBIT",
          accountCode: "2.1.1",
          referenceDate: new Date(payload.paidAt),
        },
      });
    }

    revalidatePath("/financeiro/contas-a-pagar");
    revalidatePath("/financeiro/fluxo-de-caixa");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao registrar baixa. Tente novamente.');
  }
}
