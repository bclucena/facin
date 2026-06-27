import { db } from "@facin/db";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function TenantsPage() {
  let tenants: any[] = [];
  try {
    tenants = await db.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  } catch (e) {}

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-500 text-sm mt-1">{tenants.length} distribuidoras cadastradas</p>
        </div>
        <Link href="/tenants/novo" className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors">
          + Novo tenant
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {tenants.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg font-medium">Nenhum tenant cadastrado</p>
            <p className="text-sm mt-1">Crie o primeiro tenant para começar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">CNPJ</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900"><a href={`/tenants/${tenant.slug}`} className="hover:text-green-700 hover:underline">{tenant.name}</a></td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{tenant.cnpj}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm font-mono">{tenant.slug}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tenant.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {tenant.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/cliente/${tenant.slug}/dashboard`} className="text-green-700 hover:text-green-900 text-sm font-medium mr-3" target="_blank">
                      Acessar ERP →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
