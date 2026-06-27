export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation";
import { db } from "@facin/db";

export default async function OldPedidosPage() {
  const tenant = await db.tenant.findFirst({ select: { slug: true } }).catch(() => null);
  redirect(`/cliente/${tenant?.slug ?? 'dom-padeiro'}/vendas/pedidos`);
}
