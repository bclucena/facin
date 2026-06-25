"use server";

import { revalidatePath } from "next/cache";
import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";

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
  const tenantId = getTenantId();
  await db.cliente.create({ data: { ...payload, tenantId } });
  revalidatePath(PATH);
}

export async function atualizarCliente(id: string, payload: ClientePayload) {
  await db.cliente.update({ where: { id }, data: payload });
  revalidatePath(PATH);
}

export async function toggleAtivoCliente(id: string, ativo: boolean) {
  await db.cliente.update({ where: { id }, data: { ativo } });
  revalidatePath(PATH);
}
