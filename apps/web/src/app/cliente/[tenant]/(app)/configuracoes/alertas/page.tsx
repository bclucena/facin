export const dynamic = "force-dynamic";

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { AlertasView } from "./alertas-view";

export default async function AlertasPage({
  params,
}: {
  params: { tenant: string };
}) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let alertas: { id: string; diasAntes: number; tipo: string; ativo: boolean }[] =
    [];
  try {
    alertas = await db.alertConfig.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true, diasAntes: true, tipo: true, ativo: true },
    });
  } catch (e) {
    console.error("DB Error [alertas page]:", e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Regras de notificação de títulos próximos do vencimento.
        </p>
      </div>
      <AlertasView alertas={alertas} tenantSlug={params.tenant} />
    </div>
  );
}
