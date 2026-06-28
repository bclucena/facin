"use server";

import { db } from "@facin/db";
import { revalidatePath } from "next/cache";

function resolveTenantId(slug: string): string {
  if (slug === "dom-padeiro") return "dom-padeiro-dev";
  return slug;
}

export async function criarAlerta(
  tenantSlug: string,
  data: { diasAntes: number; tipo: "PAGAR" | "RECEBER" | "AMBOS" }
) {
  const tenantId = resolveTenantId(tenantSlug);
  console.log("[criarAlerta] tenantSlug:", tenantSlug, "tenantId:", tenantId, "data:", data);
  try {
    await db.alertConfig.create({
      data: { tenantId, diasAntes: data.diasAntes, tipo: data.tipo },
    });
  } catch (e) {
    console.error("[criarAlerta] ERRO:", e);
    throw e;
  }
  revalidatePath("/", "layout");
}

export async function excluirAlerta(tenantSlug: string, id: string) {
  const tenantId = resolveTenantId(tenantSlug);
  await db.alertConfig.delete({ where: { id, tenantId } });
  revalidatePath("/", "layout");
}
