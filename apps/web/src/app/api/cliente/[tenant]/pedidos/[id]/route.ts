import { NextRequest, NextResponse } from "next/server";
import { db } from "@facin/db";
import { getTenantIdFromSlug } from "@/lib/tenant";

export async function GET(
  _req: NextRequest,
  { params }: { params: { tenant: string; id: string } }
) {
  const tenantId = getTenantIdFromSlug(params.tenant);
  try {
    const order = await db.salesOrder.findFirst({
      where: { id: params.id, tenantId },
      include: {
        items: {
          include: {
            product: { select: { codigo: true, descricao: true, unidade: true } },
          },
        },
      },
    });
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      id: order.id,
      number: order.number,
      clientName: order.clientName,
      issueDate: order.issueDate.toISOString(),
      deliveryDate: order.deliveryDate?.toISOString() ?? null,
      status: order.status,
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      total: Number(order.total),
      notes: order.notes ?? null,
      items: order.items.map((item) => ({
        id: item.id,
        productCode: item.product.codigo,
        productName: item.product.descricao,
        productUnit: item.product.unidade,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPct: Number(item.discountPct),
        totalPrice: Number(item.totalPrice),
      })),
    });
  } catch (e) {
    console.error("DB Error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
