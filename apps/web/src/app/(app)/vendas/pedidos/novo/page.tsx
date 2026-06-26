export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";
import { NovoPedidoView } from "./novo-pedido-view";

export default async function NovoPedidoPage() {
  const tenantId = getTenantId();

  const [clientes, produtos] = await Promise.all([
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

  return <NovoPedidoView clientes={clientes} produtos={produtos} />;
}