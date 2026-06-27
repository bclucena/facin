export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";
import { DepositosView } from "./depositos-view";

export default async function DepositosPage() {
  const tenantId = getTenantId();

  let depositos: any[] = [];
  try {
    depositos = await db.deposito.findMany({
      where: { tenantId },
      orderBy: { nome: "asc" },
    });
  } catch (e) {
    console.error('DB Error:', e);
  }

  return <DepositosView depositos={depositos} />;
}
