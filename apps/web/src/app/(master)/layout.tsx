import Link from "next/link";

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Painel Interno</span>
          <h1 className="text-lg font-bold text-white mt-1">Facin Master</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition-colors">
            Dashboard
          </Link>
          <Link href="/tenants" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition-colors">
            Tenants
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">⚠️ Acesso restrito</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
