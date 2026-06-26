export const dynamic = 'force-dynamic'

import { ShoppingCart } from "lucide-react";

export default function VendasPage() {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
      <ShoppingCart className="h-12 w-12 text-gray-300" />
      <div>
        <h2 className="text-lg font-semibold text-gray-700">Módulo de Vendas</h2>
        <p className="text-sm text-gray-400 mt-1">Em desenvolvimento — disponível em breve.</p>
      </div>
    </div>
  );
}