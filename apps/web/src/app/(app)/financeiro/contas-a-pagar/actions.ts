"use server";

import { revalidatePath } from "next/cache";
import { db, PaymentType, BillStatus } from "@facin/db";
import { getTenantId } from "@/lib/tenant";

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
  const tenantId = getTenantId();
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
}

export async function editarContaPagar(id: string, payload: PayablePayload) {
  const tenantId = getTenantId();
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
}

export async function excluirContaPagar(id: string) {
  const tenantId = getTenantId();
  await db.accountsPayable.delete({ where: { id, tenantId } });
  revalidatePath("/financeiro/contas-a-pagar");
}

export async function registrarBaixaPagar(payload: BaixaPayload) {
  const tenantId = getTenantId();
  await db.accountsPayable.update({
    where: { id: payload.id, tenantId },
    data: {
      status: BillStatus.PAID,
      paidAt: new Date(payload.paidAt),
      paidAmount: payload.paidAmount,
      paymentType: payload.paymentType,
    },
  });

  // Lança débito no fluxo de caixa
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
}
