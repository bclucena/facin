export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { FornecedoresView } from "./fornecedores-view";

export default async function FornecedoresPage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let fornecedores: any[] = [];
  try {
    fornecedores = await db.fornecedor.findMany({
      where: { tenantId },
      orderBy: { nome: "asc" },
    });
  } catch (e) {
    console.error('DB Error:', e);
  }

  return <FornecedoresView fornecedores={fornecedores} tenantSlug={params.tenant} />;
}
