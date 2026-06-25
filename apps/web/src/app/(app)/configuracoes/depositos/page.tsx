import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";
import { DepositosView } from "./depositos-view";

export default async function DepositosPage() {
  const tenantId = getTenantId();
  const depositos = await db.deposito.findMany({
    where: { tenantId },
    orderBy: { nome: "asc" },
  });
  return <DepositosView depositos={depositos} />;
}
