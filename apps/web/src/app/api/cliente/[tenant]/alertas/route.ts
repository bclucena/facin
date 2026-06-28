import { NextRequest, NextResponse } from "next/server";
import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

export async function GET(
  _req: NextRequest,
  { params }: { params: { tenant: string } }
) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    const configs = await db.alertConfig.findMany({
      where: { tenantId, ativo: true },
    });

    if (configs.length === 0) {
      return NextResponse.json({ count: 0, items: [] });
    }

    const now = new Date();
    const seen = new Set<string>();
    const items: {
      id: string;
      description: string;
      amount: number;
      dueDate: string;
      tipo: "PAGAR" | "RECEBER";
    }[] = [];

    for (const config of configs) {
      const cutoff = new Date(now.getTime() + config.diasAntes * 86_400_000);

      if (config.tipo === "PAGAR" || config.tipo === "AMBOS") {
        const bills = await db.accountsPayable.findMany({
          where: { tenantId, status: "PENDING", dueDate: { lte: cutoff } },
          select: { id: true, description: true, amount: true, dueDate: true },
          orderBy: { dueDate: "asc" },
        });
        for (const b of bills) {
          const key = `PAGAR-${b.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            items.push({
              id: b.id,
              description: b.description,
              amount: Number(b.amount),
              dueDate: b.dueDate.toISOString(),
              tipo: "PAGAR",
            });
          }
        }
      }

      if (config.tipo === "RECEBER" || config.tipo === "AMBOS") {
        const bills = await db.accountsReceivable.findMany({
          where: { tenantId, status: "PENDING", dueDate: { lte: cutoff } },
          select: { id: true, description: true, amount: true, dueDate: true },
          orderBy: { dueDate: "asc" },
        });
        for (const b of bills) {
          const key = `RECEBER-${b.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            items.push({
              id: b.id,
              description: b.description,
              amount: Number(b.amount),
              dueDate: b.dueDate.toISOString(),
              tipo: "RECEBER",
            });
          }
        }
      }
    }

    items.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    return NextResponse.json({ count: items.length, items });
  } catch (e) {
    console.error("DB Error [alertas]:", e);
    return NextResponse.json({ count: 0, items: [] });
  }
}
