import { BarChart3 } from "lucide-react";

export default function RelatoriosPage() {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
      <BarChart3 className="h-12 w-12 text-gray-300" />
      <div>
        <h2 className="text-lg font-semibold text-gray-700">Relatórios</h2>
        <p className="text-sm text-gray-400 mt-1">Em desenvolvimento — disponível em breve.</p>
      </div>
    </div>
  );
}
