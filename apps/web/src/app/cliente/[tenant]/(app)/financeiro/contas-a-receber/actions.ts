"use server";

import { revalidatePath } from "next/cache";
import { db, PaymentType, BillStatus } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

export interface ReceivablePayload {
  clientId?: string;
  clientName: string;
  description: string;
  amount: number;
  dueDate: string;
  notes?: string;
}

export interface BaixaPayload {
  id: string;
  receivedAt: string;
  receivedAmount: number;
  paymentType: PaymentType;
}

export async function criarContaReceber(payload: ReceivablePayload) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    await db.accountsReceivable.create({
      data: {
        tenantId,
        clientId: payload.clientId || null,
        clientName: payload.clientName,
        description: payload.description,
        amount: payload.amount,
        dueDate: new Date(payload.dueDate),
        notes: payload.notes || null,
      },
    });
    revalidatePath("/financeiro/contas-a-receber");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao salvar conta. Tente novamente.');
  }
}

export async function editarContaReceber(id: string, payload: ReceivablePayload) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    await db.accountsReceivable.update({
      where: { id, tenantId },
      data: {
        clientId: payload.clientId || null,
        clientName: payload.clientName,
        description: payload.description,
        amount: payload.amount,
        dueDate: new Date(payload.dueDate),
        notes: payload.notes || null,
      },
    });
    revalidatePath("/financeiro/contas-a-receber");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao atualizar conta. Tente novamente.');
  }
}

export async function excluirContaReceber(id: string) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    await db.accountsReceivable.delete({ where: { id, tenantId } });
    revalidatePath("/financeiro/contas-a-receber");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao excluir conta. Tente novamente.');
  }
}

export async function registrarBaixaReceber(payload: BaixaPayload) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    await db.accountsReceivable.update({
      where: { id: payload.id, tenantId },
      data: {
        status: BillStatus.PAID,
        receivedAt: new Date(payload.receivedAt),
        receivedAmount: payload.receivedAmount,
        paymentType: payload.paymentType,
      },
    });

    const bill = await db.accountsReceivable.findUnique({
      where: { id: payload.id },
      select: { clientName: true, description: true },
    });
    if (bill) {
      await db.cashFlow.create({
        data: {
          tenantId,
          description: `Recebto ${bill.clientName} — ${bill.description}`,
          amount: payload.receivedAmount,
          type: "CREDIT",
          accountCode: "1.1.1",
          referenceDate: new Date(payload.receivedAt),
        },
      });
    }

    revalidatePath("/financeiro/contas-a-receber");
    revalidatePath("/financeiro/fluxo-de-caixa");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao registrar baixa. Tente novamente.');
  }
}
