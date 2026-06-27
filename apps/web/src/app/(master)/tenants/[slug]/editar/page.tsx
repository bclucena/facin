"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

export default function EditarTenantPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    cnpj: "",
    primaryColor: "#0F5132",
    active: true,
    plan: "FREE",
  })

  useEffect(() => {
    fetch(`/api/master/tenants/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.data) setForm({
          name: data.data.name,
          cnpj: data.data.cnpj,
          primaryColor: data.data.primaryColor,
          active: data.data.active,
          plan: data.data.plan,
        })
      })
      .finally(() => setLoading(false))
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/master/tenants/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")
      router.push(`/tenants/${slug}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Tem certeza? Esta ação não pode ser desfeita.")) return
    try {
      const res = await fetch(`/api/master/tenants/${slug}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erro ao excluir")
      router.push("/tenants")
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Carregando...</div>

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/tenants" className="hover:text-gray-900">Tenants</Link>
        <span>/</span>
        <Link href={`/tenants/${slug}`} className="hover:text-gray-900">{form.name}</Link>
        <span>/</span>
        <span className="text-gray-900">Editar</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar tenant</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome da empresa *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ *</label>
          <input
            type="text"
            required
            value={form.cnpj}
            onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
          <select
            value={form.plan}
            onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="FREE">FREE</option>
            <option value="STARTER">STARTER</option>
            <option value="PRO">PRO</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cor primária</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primaryColor}
              onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
              className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <span className="text-sm font-mono text-gray-500">{form.primaryColor}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, active: true }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${form.active ? 'bg-green-700 text-white border-green-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              Ativo
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, active: false }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${!form.active ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              Inativo
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/tenants/${slug}`)}
            className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>

      <div className="mt-6 bg-white rounded-xl border border-red-200 p-6">
        <h2 className="text-sm font-medium text-red-700 mb-1">Zona de perigo</h2>
        <p className="text-sm text-gray-500 mb-4">Esta ação é permanente e não pode ser desfeita.</p>
        <button
          type="button"
          onClick={handleDelete}
          className="border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
        >
          Excluir tenant
        </button>
      </div>
    </div>
  )
}
