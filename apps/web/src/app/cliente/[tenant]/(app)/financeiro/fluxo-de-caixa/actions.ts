"use server";

import { revalidatePath } from "next/cache";
import { db, CashFlowType } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

export interface CashFlowPayload {
  description: string;
  amount: number;
  type: CashFlowType;
  accountCode?: string;
  referenceDate: string;
}

export async function criarLancamento(payload: CashFlowPayload) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    await db.cashFlow.create({
      data: {
        tenantId,
        description: payload.description,
        amount: payload.amount,
        type: payload.type,
        accountCode: payload.accountCode || null,
        referenceDate: new Date(payload.referenceDate),
      },
    });
    revalidatePath("/", "layout");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao salvar lançamento. Tente novamente.');
  }
}

export async function excluirLancamento(id: string) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    await db.cashFlow.delete({ where: { id, tenantId } });
    revalidatePath("/", "layout");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao excluir lançamento. Tente novamente.');
  }
}
