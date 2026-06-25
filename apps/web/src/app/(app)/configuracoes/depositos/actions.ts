"use server";

import { revalidatePath } from "next/cache";
import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";

const PATH = "/configuracoes/depositos";

export async function criarDeposito(nome: string) {
  const tenantId = getTenantId();
  await db.deposito.create({ data: { nome: nome.toUpperCase(), tenantId, ativo: true } });
  revalidatePath(PATH);
}

export async function atualizarDeposito(id: string, nome: string, ativo: boolean) {
  await db.deposito.update({ where: { id }, data: { nome: nome.toUpperCase(), ativo } });
  revalidatePath(PATH);
}

export async function toggleAtivoDeposito(id: string, ativo: boolean) {
  await db.deposito.update({ where: { id }, data: { ativo } });
  revalidatePath(PATH);
}
