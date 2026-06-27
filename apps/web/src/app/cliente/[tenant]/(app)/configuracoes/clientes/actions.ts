"use server";

import { revalidatePath } from "next/cache";
import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

export interface ClientePayload {
  nome: string;
  documento: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  limiteCredito: number;
  tabelaPreco?: string;
  ativo: boolean;
}

export async function criarCliente(tenantSlug: string, payload: ClientePayload) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.cliente.create({ data: { ...payload, tenantId } });
    revalidatePath("/", "layout");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error("Erro ao criar cliente");
  }
}

export async function atualizarCliente(tenantSlug: string, id: string, payload: Partial<ClientePayload>) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.cliente.update({ where: { id, tenantId }, data: payload });
    revalidatePath("/", "layout");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error("Erro ao atualizar cliente");
  }
}

export async function toggleAtivoCliente(tenantSlug: string, id: string, ativo: boolean) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.cliente.update({ where: { id, tenantId }, data: { ativo } });
    revalidatePath("/", "layout");
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error("Erro ao atualizar cliente");
  }
}
