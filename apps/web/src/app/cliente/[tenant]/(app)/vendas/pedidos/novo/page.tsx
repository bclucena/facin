export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { NovoPedidoView } from "./novo-pedido-view";

export default async function NovoPedidoPage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let clientes: any[] = [];
  let produtos: any[] = [];
  try {
    const [cls, prods] = await Promise.all([
      db.cliente.findMany({
        where: { tenantId, ativo: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, documento: true },
      }),
      db.produto.findMany({
        where: { tenantId, ativo: true },
        orderBy: { descricao: "asc" },
        select: { id: true, codigo: true, descricao: true, unidade: true },
      }),
    ]);
    clientes = cls;
    produtos = prods;
  } catch (e) {
    console.error('DB Error:', e);
  }

  return <NovoPedidoView clientes={clientes} produtos={produtos} tenantSlug={params.tenant} />;
}
