export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";
import { FornecedoresView } from "./fornecedores-view";

export default async function FornecedoresPage() {
  const tenantId = getTenantId();

  let fornecedores: any[] = [];
  try {
    fornecedores = await db.fornecedor.findMany({
      where: { tenantId },
      orderBy: { nome: "asc" },
    });
  } catch (e) {
    console.error('DB Error:', e);
  }

  return <FornecedoresView fornecedores={fornecedores} />;
}
