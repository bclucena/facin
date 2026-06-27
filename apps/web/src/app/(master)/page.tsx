import { db } from "@facin/db";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function MasterDashboardPage() {
  let totalTenants = 0;
  let activeTenants = 0;
  try {
    totalTenants = await db.tenant.count();
    activeTenants = await db.tenant.count({ where: { active: true } });
  } catch (e) {}

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral da plataforma Facin</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Total de tenants</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalTenants}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Tenants ativos</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{activeTenants}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Tenants inativos</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{totalTenants - activeTenants}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link href="/tenants" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-green-300 transition-colors flex-1">
          <h2 className="font-semibold text-gray-900">Ver todos os tenants →</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie clientes e distribuidoras</p>
        </Link>
        <Link href="/tenants/novo" className="bg-green-700 text-white rounded-xl p-6 hover:bg-green-800 transition-colors flex-1">
          <h2 className="font-semibold">+ Criar novo tenant</h2>
          <p className="text-sm text-green-200 mt-1">Adicionar nova distribuidora</p>
        </Link>
      </div>
    </div>
  );
}
