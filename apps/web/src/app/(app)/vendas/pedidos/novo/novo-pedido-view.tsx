"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@facin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarPedido } from "../actions";

type ClienteOption = { id: string; nome: string; documento: string };
type ProdutoOption = { id: string; codigo: string; descricao: string; unidade: string };

const itemSchema = z.object({
  productId:   z.string().min(1, "Selecione o produto"),
  quantity:    z.coerce.number().positive("Qtd > 0"),
  unitPrice:   z.coerce.number().positive("Preço > 0"),
  discountPct: z.coerce.number().min(0).max(100).default(0),
});

const schema = z.object({
  clientId:    z.string().default(""),
  clientName:  z.string().min(1, "Informe o cliente"),
  issueDate:   z.string().min(1, "Informe a data"),
  deliveryDate: z.string().default(""),
  notes:       z.string().default(""),
  items:       z.array(itemSchema).min(1, "Adicione ao menos um item"),
});
type FormValues = z.infer<typeof schema>;

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

const today = new Date().toISOString().slice(0, 10);
const DEFAULT: FormValues = {
  clientId: "", clientName: "", issueDate: today, deliveryDate: "", notes: "",
  items: [{ productId: "", quantity: 1, unitPrice: 0, discountPct: 0 }],
};

export function NovoPedidoView({ clientes, produtos }: { clientes: ClienteOption[]; produtos: ProdutoOption[] }) {
  const router = useRouter();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  // useWatch para recalcular totais reativamente
  const watchItems = useWatch({ control: form.control, name: "items" });

  const prodMap = Object.fromEntries(produtos.map((p) => [p.id, p]));

  const rowTotal = (i: number) => {
    const item = watchItems[i];
    if (!item) return 0;
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discountPct) || 0;
    return qty * price * (1 - disc / 100);
  };

  const subtotal = watchItems.reduce((s, item, i) => {
    const qty = Number(item?.quantity) || 0;
    const price = Number(item?.unitPrice) || 0;
    return s + qty * price;
  }, 0);

  const discountTotal = watchItems.reduce((s, item, i) => {
    const qty = Number(item?.quantity) || 0;
    const price = Number(item?.unitPrice) || 0;
    const disc = Number(item?.discountPct) || 0;
    return s + qty * price * (disc / 100);
  }, 0);

  const total = subtotal - discountTotal;

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  async function onSubmit(data: FormValues) {
    const enrichedItems = data.items.map((item, i) => {
      const prod = prodMap[item.productId];
      return {
        productId: item.productId,
        productName: prod?.descricao ?? "",
        productUnit: prod?.unidade ?? "UN",
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPct: Number(item.discountPct),
        totalPrice: rowTotal(i),
      };
    });

    try {
      await criarPedido({
        clientId: data.clientId || undefined,
        clientName: data.clientName,
        issueDate: data.issueDate,
        deliveryDate: data.deliveryDate || undefined,
        notes: data.notes || undefined,
        items: enrichedItems,
        subtotal,
        discountTotal,
        total,
      });
      toast.success("Pedido criado com sucesso");
      router.push("/vendas/pedidos");
    } catch { toast.error("Erro ao criar pedido."); }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/vendas/pedidos" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Pedido de Venda</h1>
          <p className="text-sm text-gray-500">Preencha os dados e adicione os produtos.</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Seção 1 — Cabeçalho */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Dados do pedido</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Cliente — autocomplete via Select + fallback de texto */}
            <div className="col-span-2">
              <F label="Cliente *" error={form.formState.errors.clientName?.message}>
                <div className="flex gap-2">
                  <Controller control={form.control} name="clientId" render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        const cli = clientes.find((c) => c.id === val);
                        if (cli) form.setValue("clientName", cli.nome, { shouldValidate: true });
                      }}
                    >
                      <SelectTrigger className="w-72">
                        <SelectValue placeholder="Selecionar cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome} <span className="text-gray-400 text-xs ml-1">{c.documento}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                  <Input
                    placeholder="Ou digite o nome do cliente"
                    className="flex-1"
                    {...form.register("clientName")}
                    onChange={(e) => {
                      form.setValue("clientName", e.target.value, { shouldValidate: true });
                      form.setValue("clientId", "");
                    }}
                  />
                </div>
              </F>
            </div>

            <F label="Data de emissão *" error={form.formState.errors.issueDate?.message}>
              <Input type="date" {...form.register("issueDate")} />
            </F>
            <F label="Previsão de entrega">
              <Input type="date" {...form.register("deliveryDate")} />
            </F>
          </div>
        </div>

        {/* Seção 2 — Itens */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Itens do pedido</h2>
            <button
              type="button"
              onClick={() => append({ productId: "", quantity: 1, unitPrice: 0, discountPct: 0 })}
              className="flex items-center gap-1.5 text-sm text-[#0F5132] hover:text-[#0d4429] font-medium"
            >
              <Plus size={14} /> Adicionar item
            </button>
          </div>

          {form.formState.errors.items?.message && (
            <p className="text-xs text-red-500">{form.formState.errors.items.message as string}</p>
          )}

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 w-[35%]">Produto</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-500 w-20">Qtd</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-500 w-32">Preço unit.</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-500 w-20">Desc. %</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-500 w-28">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((field, idx) => {
                  const itemErr = form.formState.errors.items?.[idx];
                  return (
                    <tr key={field.id}>
                      <td className="px-2 py-2">
                        <Controller control={form.control} name={`items.${idx}.productId`} render={({ field: f }) => (
                          <Select
                            value={f.value}
                            onValueChange={(val) => {
                              f.onChange(val);
                              // Preenche o preço com 0 (sem tabela de preços ainda)
                            }}
                          >
                            <SelectTrigger className={`h-8 text-sm ${itemErr?.productId ? "border-red-400" : ""}`}>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {produtos.map((p) => (
                                <SelectItem key={p.id} value={p.id} className="text-sm">
                                  <span className="font-mono text-gray-400 text-xs mr-1">{p.codigo}</span>
                                  {p.descricao}
                                  <span className="text-gray-400 text-xs ml-1">/ {p.unidade}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )} />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number" min={0.001} step={0.001}
                          className={`h-8 text-sm text-right ${itemErr?.quantity ? "border-red-400" : ""}`}
                          {...form.register(`items.${idx}.quantity`)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number" min={0} step={0.0001}
                          className={`h-8 text-sm text-right ${itemErr?.unitPrice ? "border-red-400" : ""}`}
                          {...form.register(`items.${idx}.unitPrice`)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number" min={0} max={100} step={0.01}
                          className="h-8 text-sm text-right"
                          {...form.register(`items.${idx}.discountPct`)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-gray-800">
                        {fmt(rowTotal(idx))}
                      </td>
                      <td className="pr-2 py-2">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(idx)} className="p-1 rounded text-gray-300 hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Resumo */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{fmt(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Desconto</span>
                  <span className="tabular-nums">- {fmt(discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-1.5">
                <span>Total</span>
                <span className="tabular-nums">{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 3 — Observações */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <F label="Observações">
            <textarea
              rows={3}
              placeholder="Instruções de entrega, condições especiais..."
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F5132] focus:ring-offset-1 resize-none"
              {...form.register("notes")}
            />
          </F>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/vendas/pedidos">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={form.formState.isSubmitting} className="px-8">
            {form.formState.isSubmitting ? "Salvando..." : "Salvar pedido"}
          </Button>
        </div>
      </form>
    </div>
  );
}
