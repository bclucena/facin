export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { TabelasPrecoView } from "./tabelas-preco-view";

export default async function TabelasPrecoPage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let tabelas: any[] = [];
  try {
    const raw = await db.tabelaPreco.findMany({
      where: { tenantId },
      orderBy: { nome: "asc" },
    });
    tabelas = raw.map((t) => ({ ...t, desconto: Number(t.desconto) }));
  } catch (e) {
    console.error("DB Error:", e);
  }

  return <TabelasPrecoView tabelas={tabelas} tenantSlug={params.tenant} />;
}
