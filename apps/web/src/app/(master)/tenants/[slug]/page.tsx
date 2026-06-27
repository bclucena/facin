import { db } from "@facin/db"
import { notFound } from "next/navigation"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function TenantDetailPage({ params }: { params: { slug: string } }) {
  let tenant = null
  try {
    tenant = await db.tenant.findUnique({ where: { slug: params.slug } })
  } catch (e) {}

  if (!tenant) notFound()

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/tenants" className="hover:text-gray-900">Tenants</Link>
        <span>/</span>
        <span className="text-gray-900">{tenant.name}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="text-gray-500 text-sm mt-1">CNPJ: {tenant.cnpj}</p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${tenant.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {tenant.active ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Plano</p>
          <p className="text-lg font-semibold text-gray-900">{tenant.plan}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Slug</p>
          <p className="text-lg font-mono text-gray-900">{tenant.slug}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cor primária</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: tenant.primaryColor }} />
            <span className="font-mono text-sm">{tenant.primaryColor}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Criado em</p>
          <p className="text-sm text-gray-900">{new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href={`/cliente/${tenant.slug}/dashboard`}
          target="_blank"
          className="flex-1 bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors text-center"
        >
          Acessar ERP →
        </Link>
        <Link
          href={`/tenants/${tenant.slug}/editar`}
          className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-center"
        >
          Editar tenant
        </Link>
      </div>
    </div>
  )
}
