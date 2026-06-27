export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { ClientesView } from "./clientes-view";

export default async function ClientesPage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let clientes: any[] = [];
  try {
    const raw = await db.cliente.findMany({
      where: { tenantId },
      orderBy: { nome: "asc" },
    });
    clientes = raw.map((c) => ({
      ...c,
      limiteCredito: Number(c.limiteCredito),
    }));
  } catch (e) {
    console.error('DB Error:', e);
  }

  return <ClientesView clientes={clientes} />;
}
