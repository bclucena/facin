import { NextRequest, NextResponse } from "next/server"
import { db } from "@facin/db"

export async function GET(_: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const tenant = await db.tenant.findUnique({ where: { slug: params.slug } })
    if (!tenant) return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 })
    return NextResponse.json({ data: tenant })
  } catch {
    return NextResponse.json({ error: "Erro ao buscar tenant" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { name, cnpj, primaryColor, active, plan } = await req.json()
    const tenant = await db.tenant.update({
      where: { slug: params.slug },
      data: { name, cnpj, primaryColor, active, plan },
    })
    return NextResponse.json({ data: tenant })
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar tenant" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await db.tenant.delete({ where: { slug: params.slug } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Erro ao excluir tenant" }, { status: 500 })
  }
}
