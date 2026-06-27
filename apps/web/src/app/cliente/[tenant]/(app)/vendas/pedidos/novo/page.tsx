export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { NovoPedidoView } from "./novo-pedido-view";

export default async function NovoPedidoPage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let clientes: any[] = [];
  let produtos: any[] = [];

  try {
    clientes = await db.cliente.findMany({
      where: { tenantId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, documento: true },
    });
  } catch (e) {
    console.error('DB Error (clientes):', e);
  }

  try {
    const prods = await db.produto.findMany({
      where: { tenantId, ativo: true },
      orderBy: { descricao: "asc" },
      select: { id: true, codigo: true, descricao: true, unidade: true, precoVenda: true },
    });
    produtos = prods.map((p) => ({ ...p, precoVenda: Number(p.precoVenda) }));
  } catch (e) {
    console.error('DB Error (produtos):', e);
  }

  return <NovoPedidoView clientes={clientes} produtos={produtos} tenantSlug={params.tenant} />;
}
