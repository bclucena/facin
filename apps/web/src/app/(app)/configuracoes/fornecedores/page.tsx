export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";
import { FornecedoresView } from "./fornecedores-view";

export default async function FornecedoresPage() {
  const tenantId = getTenantId();
  const fornecedores = await db.fornecedor.findMany({
    where: { tenantId },
    orderBy: { nome: "asc" },
  });
  return <FornecedoresView fornecedores={fornecedores} />;
}