"use server";

import { revalidatePath } from "next/cache";
import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";

const PATH = "/configuracoes/produtos";

export interface ProdutoPayload {
  codigo: string;
  codigoBarras?: string;
  descricao: string;
  unidade: string;
  tipo?: string;
  grupo?: string;
  fabricante?: string;
  estoqueMinimo: number;
  ativo: boolean;
}

export async function criarProduto(payload: ProdutoPayload) {
  const tenantId = getTenantId();
  try {
    await db.produto.create({ data: { ...payload, tenantId } });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao salvar produto. Tente novamente.');
  }
}

export async function atualizarProduto(id: string, payload: ProdutoPayload) {
  try {
    await db.produto.update({ where: { id }, data: payload });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao atualizar produto. Tente novamente.');
  }
}

export async function toggleAtivoProduto(id: string, ativo: boolean) {
  try {
    await db.produto.update({ where: { id }, data: { ativo } });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao atualizar produto. Tente novamente.');
  }
}
