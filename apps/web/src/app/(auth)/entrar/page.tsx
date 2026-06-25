import Link from "next/link";

export default function EntrarPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center shadow-sm max-w-sm w-full">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Facin ERP</h1>
        <p className="text-sm text-gray-500 mb-6">Autenticação em configuração.</p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-[#0F5132] text-white text-sm rounded-lg hover:bg-[#0d4229] transition-colors"
        >
          Entrar no sistema
        </Link>
      </div>
    </div>
  );
}
