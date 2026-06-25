import { db } from "@facin/db";
import { getTenantId } from "@/lib/tenant";
import { ProdutosView } from "./produtos-view";

export default async function ProdutosPage() {
  const tenantId = getTenantId();
  const raw = await db.produto.findMany({
    where: { tenantId },
    orderBy: { descricao: "asc" },
  });
  const produtos = raw.map((p) => ({
    ...p,
    estoqueMinimo: Number(p.estoqueMinimo),
  }));
  return <ProdutosView produtos={produtos} />;
}
