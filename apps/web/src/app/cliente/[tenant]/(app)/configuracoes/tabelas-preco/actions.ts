"use server";

import { revalidatePath } from "next/cache";
import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

export interface TabelaPrecoPayload {
  nome: string;
  desconto: number;
  ativo: boolean;
}

export async function criarTabela(tenantSlug: string, payload: TabelaPrecoPayload) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.tabelaPreco.create({ data: { ...payload, tenantId } });
    revalidatePath("/", "layout");
  } catch (e) {
    console.error("DB Error:", e);
    throw new Error("Erro ao criar tabela de preço. Tente novamente.");
  }
}

export async function atualizarTabela(tenantSlug: string, id: string, payload: TabelaPrecoPayload) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.tabelaPreco.update({ where: { id, tenantId }, data: payload });
    revalidatePath("/", "layout");
  } catch (e) {
    console.error("DB Error:", e);
    throw new Error("Erro ao atualizar tabela de preço. Tente novamente.");
  }
}

export async function toggleAtivoTabela(tenantSlug: string, id: string, ativo: boolean) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.tabelaPreco.update({ where: { id, tenantId }, data: { ativo } });
    revalidatePath("/", "layout");
  } catch (e) {
    console.error("DB Error:", e);
    throw new Error("Erro ao atualizar tabela de preço. Tente novamente.");
  }
}

export async function deletarTabela(tenantSlug: string, id: string) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.tabelaPreco.delete({ where: { id, tenantId } });
    revalidatePath("/", "layout");
  } catch (e) {
    console.error("DB Error:", e);
    throw new Error("Erro ao deletar tabela");
  }
}
