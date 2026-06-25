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
  await db.produto.create({ data: { ...payload, tenantId } });
  revalidatePath(PATH);
}

export async function atualizarProduto(id: string, payload: ProdutoPayload) {
  await db.produto.update({ where: { id }, data: payload });
  revalidatePath(PATH);
}

export async function toggleAtivoProduto(id: string, ativo: boolean) {
  await db.produto.update({ where: { id }, data: { ativo } });
  revalidatePath(PATH);
}
