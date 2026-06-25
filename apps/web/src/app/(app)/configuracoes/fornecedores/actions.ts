"use server";

import { revalidatePath } from "next/cache";
import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";

const PATH = "/configuracoes/fornecedores";

export interface FornecedorPayload {
  nome: string;
  cnpj: string;
  ie?: string;
  tipoAtividade?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  prazoEntrega: number;
  ativo: boolean;
}

export async function criarFornecedor(payload: FornecedorPayload) {
  const tenantId = getTenantId();
  await db.fornecedor.create({ data: { ...payload, tenantId } });
  revalidatePath(PATH);
}

export async function atualizarFornecedor(id: string, payload: FornecedorPayload) {
  await db.fornecedor.update({ where: { id }, data: payload });
  revalidatePath(PATH);
}

export async function toggleAtivoFornecedor(id: string, ativo: boolean) {
  await db.fornecedor.update({ where: { id }, data: { ativo } });
  revalidatePath(PATH);
}
