"use server";

import { revalidatePath } from "next/cache";
import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

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
  precoVenda: number;
  ativo: boolean;
}

export async function criarProduto(tenantSlug: string, payload: ProdutoPayload) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.produto.create({ data: { ...payload, tenantId } });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao salvar produto. Tente novamente.');
  }
}

export async function atualizarProduto(tenantSlug: string, id: string, payload: ProdutoPayload) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.produto.update({ where: { id, tenantId }, data: payload });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao atualizar produto. Tente novamente.');
  }
}

export async function toggleAtivoProduto(tenantSlug: string, id: string, ativo: boolean) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  try {
    await db.produto.update({ where: { id, tenantId }, data: { ativo } });
    revalidatePath(PATH);
  } catch (e) {
    console.error('DB Error:', e);
    throw new Error('Erro ao atualizar produto. Tente novamente.');
  }
}
