import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";
import { ClientesView } from "./clientes-view";

export default async function ClientesPage() {
  const tenantId = getTenantId();
  const raw = await db.cliente.findMany({
    where: { tenantId },
    orderBy: { nome: "asc" },
  });

  // Decimal não é serializável para client components — converte para number
  const clientes = raw.map((c) => ({
    ...c,
    limiteCredito: Number(c.limiteCredito),
  }));

  return <ClientesView clientes={clientes} />;
}
