"use server";

import { revalidatePath } from "next/cache";
import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

const PATH = "/configuracoes/depositos";

export async function criarDeposito(tenantSlug: string, nome: string) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.deposito.create({ data: { nome: nome.toUpperCase(), tenantId, ativo: true } });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao salvar depósito. Tente novamente.');
  }
}

export async function atualizarDeposito(tenantSlug: string, id: string, nome: string, ativo: boolean) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.deposito.update({ where: { id, tenantId }, data: { nome: nome.toUpperCase(), ativo } });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao atualizar depósito. Tente novamente.');
  }
}

export async function toggleAtivoDeposito(tenantSlug: string, id: string, ativo: boolean) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.deposito.update({ where: { id, tenantId }, data: { ativo } });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao atualizar depósito. Tente novamente.');
  }
}
