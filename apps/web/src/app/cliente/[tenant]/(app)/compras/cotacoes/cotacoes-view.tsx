"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, ArrowRightCircle, Send, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@facin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { criarCotacao, excluirCotacao, atualizarStatusCotacao, converterParaOC } from "./actions";
import type { QuoteStatus } from "@facin/db";

const STATUS_CONFIG = {
  DRAFT:     { label: "Rascunho",   class: "border-gray-300 text-gray-600 bg-gray-50" },
  SENT:      { label: "Enviada",    class: "border-blue-400 text-blue-700 bg-blue-50" },
  CONVERTED: { label: "Convertida", class: "border-green-400 text-green-700 bg-green-50" },
};

export type QuoteItem = {
  id: string; productId: string; productName: string; productUnit: string;
  quantity: number; unitCost: number; totalCost: number;
};
export type QuoteRow = {
  id: string; number: string; supplierName: string; issueDate: string;
  expectedDate: string | null; paymentTerms: string | null;
  status: string; totalAmount: number; itemCount: number; items: QuoteItem[];
};
type FornecedorOption = { id: string; nome: string };
type ProdutoOption   = { id: string; codigo: string; descricao: string; unidade: string };

const itemSchema = z.object({
  productId: z.string().min(1, "Selecione o produto"),
  quantity:  z.coerce.number().positive("Qtd > 0"),
  unitCost:  z.coerce.number().positive("Custo > 0"),
});

const schema = z.object({
  supplierId:   z.string().min(1, "Selecione o fornecedor"),
  issueDate:    z.string().min(1, "Informe a data"),
  expectedDate: z.string().default(""),
  paymentTerms: z.string().default(""),
  items: z.array(itemSchema).min(1, "Adicione ao menos um item"),
});
type FormValues = z.infer<typeof schema>;

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const today = new Date().toISOString().slice(0, 10);
const DEFAULT: FormValues = { supplierId: "", issueDate: today, expectedDate: "", paymentTerms: "", items: [{ productId: "", quantity: 1, unitCost: 0 }] };

export function CotacoesView({ quotes, fornecedores, produtos }: { quotes: QuoteRow[]; fornecedores: FornecedorOption[]; produtos: ProdutoOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues>, defaultValues: DEFAULT });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchItems = form.watch("items");

  const rowTotal = (i: number) => (Number(watchItems[i]?.quantity) || 0) * (Number(watchItems[i]?.unitCost) || 0);
  const grandTotal = watchItems.reduce((s, _, i) => s + rowTotal(i), 0);

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  async function onSubmit(data: FormValues) {
    const supplier = fornecedores.find((f) => f.id === data.supplierId);
    const enrichedItems = data.items.map((item, i) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitCost: Number(item.unitCost),
      totalCost: rowTotal(i),
    }));
    try {
      await criarCotacao({
        supplierId: data.supplierId,
        supplierName: supplier?.nome ?? "",
        issueDate: data.issueDate,
        expectedDate: data.expectedDate || undefined,
        paymentTerms: data.paymentTerms || undefined,
        items: enrichedItems,
        totalAmount: grandTotal,
      });
      toast.success("Cotação criada");
      setSheetOpen(false);
      form.reset(DEFAULT);
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao criar cotação."); }
  }

  async function onDelete(id: string) {
    if (!confirm("Excluir esta cotação?")) return;
    try {
      await excluirCotacao(id);
      toast.success("Cotação excluída");
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao excluir."); }
  }

  async function onMarkSent(id: string) {
    try {
      await atualizarStatusCotacao(id, "SENT" as QuoteStatus);
      toast.success("Cotação marcada como enviada");
      startTransition(() => router.refresh());
    } catch { toast.error("Erro."); }
  }

  async function onConvert(id: string) {
    if (!confirm("Converter esta cotação em Ordem de Compra?")) return;
    try {
      await converterParaOC(id);
      toast.success("Ordem de compra criada");
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao converter."); }
  }

  return (
    <>
      <div className="space-y-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/compras" className="text-gray-400 hover:text-gray-600">
                <ChevronLeft size={18} />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Cotações</h1>
            </div>
            <p className="text-sm text-gray-500">{quotes.length} cotações</p>
          </div>
          <Button onClick={() => { form.reset(DEFAULT); setSheetOpen(true); }} className="gap-2" disabled={isPending}>
            <Plus size={16} /> Nova cotação
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-center">Itens</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-sm text-gray-400">
                    Nenhuma cotação registrada.
                  </TableCell>
                </TableRow>
              ) : quotes.map((q) => {
                const cfg = STATUS_CONFIG[q.status as keyof typeof STATUS_CONFIG];
                return (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-sm font-medium">{q.number}</TableCell>
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {new Date(q.issueDate).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{q.supplierName}</TableCell>
                    <TableCell className="text-center text-sm text-gray-500">{q.itemCount}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmt(q.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cfg.class}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {q.status === "DRAFT" && (
                          <button
                            onClick={() => onMarkSent(q.id)}
                            title="Marcar como enviada"
                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Send size={13} />
                          </button>
                        )}
                        {(q.status === "DRAFT" || q.status === "SENT") && (
                          <button
                            onClick={() => onConvert(q.id)}
                            title="Converter em OC"
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-[#0F5132] text-white hover:bg-[#0d4429] transition-colors"
                          >
                            <ArrowRightCircle size={11} /> Converter
                          </button>
                        )}
                        {q.status !== "CONVERTED" && (
                          <button
                            onClick={() => onDelete(q.id)}
                            title="Excluir"
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Sheet — nova cotação */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) setSheetOpen(false); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="px-6">
            <SheetTitle>Nova cotação</SheetTitle>
            <SheetDescription>Preencha os dados e adicione os produtos cotados.</SheetDescription>
          </SheetHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-6">
            {/* Cabeçalho da cotação */}
            <F label="Fornecedor *" error={form.formState.errors.supplierId?.message}>
              <Controller control={form.control} name="supplierId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </F>

            <div className="grid grid-cols-2 gap-3">
              <F label="Data de emissão *" error={form.formState.errors.issueDate?.message}>
                <Input type="date" {...form.register("issueDate")} />
              </F>
              <F label="Previsão de entrega">
                <Input type="date" {...form.register("expectedDate")} />
              </F>
            </div>

            <F label="Condição de pagamento">
              <Input placeholder="Ex: 30/60 dias, À vista, Boleto 28d" {...form.register("paymentTerms")} />
            </F>

            {/* Tabela de itens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-600">Itens *</Label>
                <button
                  type="button"
                  onClick={() => append({ productId: "", quantity: 1, unitCost: 0 })}
                  className="flex items-center gap-1 text-xs text-[#0F5132] hover:text-[#0d4429] font-medium"
                >
                  <Plus size={12} /> Adicionar item
                </button>
              </div>

              {form.formState.errors.items?.message && (
                <p className="text-xs text-red-500">{form.formState.errors.items.message as string}</p>
              )}

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 w-[40%]">Produto</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 w-20">Qtd</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 w-28">Custo unit.</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 w-24">Total</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fields.map((field, idx) => (
                      <tr key={field.id}>
                        <td className="px-2 py-1.5">
                          <Controller control={form.control} name={`items.${idx}.productId`} render={({ field: f }) => (
                            <Select value={f.value} onValueChange={f.onChange}>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {produtos.map((p) => (
                                  <SelectItem key={p.id} value={p.id} className="text-xs">
                                    {p.codigo} — {p.descricao}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min={0.001} step={0.001} className="h-7 text-xs text-right" {...form.register(`items.${idx}.quantity`)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min={0.0001} step={0.0001} className="h-7 text-xs text-right" {...form.register(`items.${idx}.unitCost`)} />
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium tabular-nums text-gray-700">
                          {fmt(rowTotal(idx))}
                        </td>
                        <td className="pr-2 py-1.5">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(idx)} className="p-1 rounded text-gray-300 hover:text-red-500">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Total</td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-gray-900 tabular-nums">{fmt(grandTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>Criar cotação</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
