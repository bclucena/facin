import { NextRequest, NextResponse } from "next/server"
import { db } from "@facin/db"

export async function POST(req: NextRequest) {
  try {
    const { name, cnpj, slug, primaryColor } = await req.json()

    if (!name || !cnpj || !slug) {
      return NextResponse.json({ error: "Nome, CNPJ e slug são obrigatórios" }, { status: 400 })
    }

    const tenant = await db.tenant.create({
      data: {
        name,
        cnpj,
        slug,
        primaryColor: primaryColor || "#0F5132",
        clerkOrgId: `org_${slug}_${Date.now()}`,
        plan: "FREE",
        active: true,
      },
    })

    return NextResponse.json({ data: tenant })
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "CNPJ ou slug já cadastrado" }, { status: 409 })
    }
    return NextResponse.json({ error: "Erro ao criar tenant" }, { status: 500 })
  }
}
