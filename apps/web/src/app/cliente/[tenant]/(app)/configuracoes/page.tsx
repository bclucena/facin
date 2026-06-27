export const dynamic = 'force-dynamic'

import Link from "next/link";
import { Users, Truck, Package, Warehouse, Tag, UserCog, ChevronRight } from "lucide-react";

const modules = [
  { href: "/configuracoes/clientes", icon: Users, label: "Clientes", description: "Cadastro de clientes e tabelas de crédito", available: true },
  { href: "/configuracoes/fornecedores", icon: Truck, label: "Fornecedores", description: "Fornecedores, prazos e condições de compra", available: true },
  { href: "/configuracoes/produtos", icon: Package, label: "Produtos", description: "Catálogo de produtos, grupos e fabricantes", available: true },
  { href: "/configuracoes/depositos", icon: Warehouse, label: "Depósitos", description: "Locais de armazenamento e separação", available: true },
  { href: "/configuracoes/tabelas-preco", icon: Tag, label: "Tabelas de Preço", description: "Configuração de tabelas e política de preços", available: false },
  { href: "/configuracoes/usuarios", icon: UserCog, label: "Usuários", description: "Permissões e acessos dos colaboradores", available: false },
];

export default function ConfiguracoesPage({ params }: { params: { tenant: string } }) {
  const base = `/cliente/${params.tenant}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie os cadastros e parâmetros do sistema.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules.map(({ href, icon: Icon, label, description, available }) =>
          available ? (
            <Link
              key={href}
              href={`${base}${href}`}
              className="group flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 group-hover:text-gray-600 transition-colors" />
            </Link>
          ) : (
            <div
              key={href}
              className="flex items-center gap-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-5 opacity-60 cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-600 text-sm">{label}</p>
                  <span className="text-[10px] font-medium bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">Em breve</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{description}</p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
