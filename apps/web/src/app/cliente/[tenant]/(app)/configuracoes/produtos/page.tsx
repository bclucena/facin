export const dynamic = 'force-dynamic'

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { ProdutosView } from "./produtos-view";

export default async function ProdutosPage({ params }: { params: { tenant: string } }) {
  const tenantId = getTenantIdFromSlug(params.tenant);

  let produtos: any[] = [];
  try {
    const raw = await db.produto.findMany({
      where: { tenantId },
      orderBy: { descricao: "asc" },
    });
    produtos = raw.map((p) => ({
      ...p,
      estoqueMinimo: Number(p.estoqueMinimo),
    }));
  } catch (e) {
    console.error('DB Error:', e);
  }

  return <ProdutosView produtos={produtos} />;
}
