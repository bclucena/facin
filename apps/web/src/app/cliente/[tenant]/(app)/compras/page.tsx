export const dynamic = 'force-dynamic'

import Link from "next/link";
import { FileSearch, ShoppingBag, Truck, ChevronRight } from "lucide-react";

const modules = [
  {
    href: "/compras/cotacoes",
    icon: FileSearch,
    label: "Cotações",
    description: "Solicite e compare cotações de fornecedores",
    available: true,
  },
  {
    href: "/compras/ordens",
    icon: ShoppingBag,
    label: "Ordens de Compra",
    description: "Gerencie ordens e recebimentos de mercadoria",
    available: true,
  },
  {
    href: "/configuracoes/fornecedores",
    icon: Truck,
    label: "Fornecedores",
    description: "Cadastro de fornecedores e condições de compra",
    available: true,
  },
];

export default function ComprasPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
        <p className="text-sm text-gray-500 mt-1">Cotações, ordens de compra e recebimento de mercadoria.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
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
        ))}
      </div>
    </div>
  );
}