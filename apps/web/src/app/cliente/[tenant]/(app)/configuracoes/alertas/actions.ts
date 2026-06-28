"use server";

import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function criarAlerta(
  tenantSlug: string,
  data: { diasAntes: number; tipo: "PAGAR" | "RECEBER" | "AMBOS" }
) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  await db.alertConfig.create({
    data: { tenantId, diasAntes: data.diasAntes, tipo: data.tipo },
  });
  revalidatePath("/", "layout");
}

export async function excluirAlerta(tenantSlug: string, id: string) {
  const tenantId = getTenantIdFromSlug(tenantSlug);
  await db.alertConfig.delete({ where: { id, tenantId } });
  revalidatePath("/", "layout");
}
