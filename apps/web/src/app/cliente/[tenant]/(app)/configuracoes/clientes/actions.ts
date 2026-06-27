"use server";

import { revalidatePath } from "next/cache";
import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

const PATH = "/configuracoes/clientes";

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

export async function criarCliente(payload: ClientePayload) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    await db.cliente.create({ data: { ...payload, tenantId } });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao salvar cliente. Tente novamente.');
  }
}

export async function atualizarCliente(id: string, payload: ClientePayload) {
  try {
    await db.cliente.update({ where: { id }, data: payload });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao atualizar cliente. Tente novamente.');
  }
}

export async function toggleAtivoCliente(id: string, ativo: boolean) {
  try {
    await db.cliente.update({ where: { id }, data: { ativo } });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao atualizar cliente. Tente novamente.');
  }
}
