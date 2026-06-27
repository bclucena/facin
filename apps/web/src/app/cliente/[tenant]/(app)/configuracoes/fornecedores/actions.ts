"use server";

import { revalidatePath } from "next/cache";
import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

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
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    await db.fornecedor.create({ data: { ...payload, tenantId } });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao salvar fornecedor. Tente novamente.');
  }
}

export async function atualizarFornecedor(id: string, payload: FornecedorPayload) {
  try {
    await db.fornecedor.update({ where: { id }, data: payload });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao atualizar fornecedor. Tente novamente.');
  }
}

export async function toggleAtivoFornecedor(id: string, ativo: boolean) {
  try {
    await db.fornecedor.update({ where: { id }, data: { ativo } });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao atualizar fornecedor. Tente novamente.');
  }
}
