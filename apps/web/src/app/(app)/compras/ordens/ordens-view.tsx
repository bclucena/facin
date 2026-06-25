"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, FileInput, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@facin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { criarOrdem, excluirOrdem, receberNF } from "./actions";

const STATUS_CONFIG = {
  PENDING:   { label: "Pendente",  class: "border-amber-400 text-amber-700 bg-amber-50" },
  RECEIVED:  { label: "Recebida", class: "border-green-400 text-green-700 bg-green-50" },
  CANCELLED: { label: "Cancelada", class: "border-gray-300 text-gray-600 bg-gray-50" },
};

type OrderItem = {
  id: string; productId: string; productName: string; productUnit: string;
  quantity: number; unitCost: number; totalCost: number; receivedQty: number;
};
type OrderRow = {
  id: string; number: string; supplierName: string; supplierId: string | null;
  issueDate: string; expectedDate: string | null; paymentTerms: string | null;
  status: string; totalAmount: number;
  nfNumber: string | null; nfDate: string | null; nfAmount: number | null;
  quoteId: string | null; items: OrderItem[];
};
type DepositoOption = { id: string; nome: string };
type FornecedorOption = { id: string; nome: string };
type ProdutoOption = { id: string; codigo: string; descricao: string; unidade: string };
type QuoteOption = { id: string; number: string; supplierName: string };

// --- Schema: criar OC manualmente ---
const itemSchema = z.object({
  productId: z.string().min(1, "Selecione o produto"),
  quantity: z.coerce.number().positive("Qtd > 0"),
  unitCost: z.coerce.number().positive("Custo > 0"),
});
const createSchema = z.object({
  supplierId: z.string().min(1, "Selecione o fornecedor"),
  quoteId: z.string().default(""),
  issueDate: z.string().min(1, "Informe a data"),
  expectedDate: z.string().default(""),
  paymentTerms: z.string().default(""),
  items: z.array(itemSchema).min(1, "Adicione ao menos um item"),
});
type CreateValues = z.infer<typeof createSchema>;

// --- Schema: receber NF ---
const receberSchema = z.object({
  nfNumber: z.string().min(1, "Informe o número da NF"),
  nfDate: z.string().min(1, "Informe a data da NF"),
  nfAmount: z.coerce.number().positive("Valor > 0"),
  warehouseId: z.string().min(1, "Selecione o depósito"),
  dueDate: z.string().min(1, "Informe o vencimento"),
  receivedQtys: z.array(z.object({ qty: z.coerce.number().min(0) })),
});
type ReceberValues = z.infer<typeof receberSchema>;

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
const DEFAULT_CREATE: CreateValues = {
  supplierId: "", quoteId: "", issueDate: today,
  expectedDate: "", paymentTerms: "",
  items: [{ productId: "", quantity: 1, unitCost: 0 }],
};

export function OrdensView({ orders, fornecedores, produtos, depositos, quotes }: {
  orders: OrderRow[];
  fornecedores: FornecedorOption[];
  produtos: ProdutoOption[];
  depositos: DepositoOption[];
  quotes: QuoteOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [receberOrder, setReceberOrder] = useState<OrderRow | null>(null);

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // --- Criar OC form ---
  const createForm = useForm<CreateValues>({ resolver: zodResolver(createSchema) as Resolver<CreateValues>, defaultValues: DEFAULT_CREATE });
  const { fields, append, remove } = useFieldArray({ control: createForm.control, name: "items" });
  const watchItems = createForm.watch("items");
  const rowTotal = (i: number) => (Number(watchItems[i]?.quantity) || 0) * (Number(watchItems[i]?.unitCost) || 0);
  const grandTotal = watchItems.reduce((s, _, i) => s + rowTotal(i), 0);

  async function onCreateSubmit(data: CreateValues) {
    const supplier = fornecedores.find((f) => f.id === data.supplierId);
    try {
      await criarOrdem({
        supplierId: data.supplierId,
        supplierName: supplier?.nome ?? "",
        quoteId: data.quoteId || undefined,
        issueDate: data.issueDate,
        expectedDate: data.expectedDate || undefined,
        paymentTerms: data.paymentTerms || undefined,
        items: data.items.map((item, i) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
          totalCost: rowTotal(i),
        })),
        totalAmount: grandTotal,
      });
      toast.success("Ordem de compra criada");
      setSheetOpen(false);
      createForm.reset(DEFAULT_CREATE);
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao criar ordem."); }
  }

  async function onDelete(id: string) {
    if (!confirm("Excluir esta ordem de compra?")) return;
    try {
      await excluirOrdem(id);
      toast.success("Ordem excluída");
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao excluir."); }
  }

  // --- Receber NF form ---
  const receberForm = useForm<ReceberValues>({
    resolver: zodResolver(receberSchema) as Resolver<ReceberValues>,
    defaultValues: { nfNumber: "", nfDate: today, nfAmount: 0, warehouseId: "", dueDate: "", receivedQtys: [] },
  });

  function openReceberDialog(order: OrderRow) {
    setReceberOrder(order);
    receberForm.reset({
      nfNumber: "",
      nfDate: today,
      nfAmount: Number(order.totalAmount.toFixed(2)),
      warehouseId: depositos[0]?.id ?? "",
      dueDate: "",
      receivedQtys: order.items.map((item) => ({ qty: item.quantity })),
    });
  }

  async function onReceberSubmit(data: ReceberValues) {
    if (!receberOrder) return;
    try {
      await receberNF({
        orderId: receberOrder.id,
        nfNumber: data.nfNumber,
        nfDate: data.nfDate,
        nfAmount: Number(data.nfAmount),
        warehouseId: data.warehouseId,
        dueDate: data.dueDate,
        items: receberOrder.items.map((item, i) => ({
          itemId: item.id,
          productId: item.productId,
          receivedQty: Number(data.receivedQtys[i]?.qty ?? 0),
          unitCost: item.unitCost,
        })),
      });
      toast.success("NF recebida — estoque e contas atualizados");
      setReceberOrder(null);
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao receber NF."); }
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
              <h1 className="text-2xl font-bold text-gray-900">Ordens de Compra</h1>
            </div>
            <p className="text-sm text-gray-500">{orders.length} ordens</p>
          </div>
          <Button onClick={() => { createForm.reset(DEFAULT_CREATE); setSheetOpen(true); }} className="gap-2" disabled={isPending}>
            <Plus size={16} /> Nova OC
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
                <TableHead className="text-right">Total OC</TableHead>
                <TableHead>NF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-sm text-gray-400">
                    Nenhuma ordem de compra registrada.
                  </TableCell>
                </TableRow>
              ) : orders.map((o) => {
                const cfg = STATUS_CONFIG[o.status as keyof typeof STATUS_CONFIG];
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm font-medium">{o.number}</TableCell>
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {new Date(o.issueDate).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{o.supplierName}</TableCell>
                    <TableCell className="text-center text-sm text-gray-500">{o.items.length}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmt(o.totalAmount)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {o.nfNumber ? (
                        <span className="font-mono">{o.nfNumber}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cfg.class}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {o.status === "PENDING" && (
                          <button
                            onClick={() => openReceberDialog(o)}
                            title="Receber NF"
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-[#0F5132] text-white hover:bg-[#0d4429] transition-colors"
                          >
                            <FileInput size={11} /> Receber NF
                          </button>
                        )}
                        {o.status !== "RECEIVED" && (
                          <button
                            onClick={() => onDelete(o.id)}
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

      {/* Sheet — nova OC manual */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) setSheetOpen(false); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="px-6">
            <SheetTitle>Nova Ordem de Compra</SheetTitle>
            <SheetDescription>Crie uma OC manualmente ou converta uma cotação existente.</SheetDescription>
          </SheetHeader>

          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5 px-6">
            <F label="Fornecedor *" error={createForm.formState.errors.supplierId?.message}>
              <Controller control={createForm.control} name="supplierId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </F>

            <F label="Cotação de origem (opcional)">
              <Controller control={createForm.control} name="quoteId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    {quotes.map((q) => (
                      <SelectItem key={q.id} value={q.id}>{q.number} — {q.supplierName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </F>

            <div className="grid grid-cols-2 gap-3">
              <F label="Data de emissão *" error={createForm.formState.errors.issueDate?.message}>
                <Input type="date" {...createForm.register("issueDate")} />
              </F>
              <F label="Previsão de entrega">
                <Input type="date" {...createForm.register("expectedDate")} />
              </F>
            </div>

            <F label="Condição de pagamento">
              <Input placeholder="Ex: 30 dias, À vista" {...createForm.register("paymentTerms")} />
            </F>

            {/* Itens */}
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
                          <Controller control={createForm.control} name={`items.${idx}.productId`} render={({ field: f }) => (
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
                          <Input type="number" min={0.001} step={0.001} className="h-7 text-xs text-right" {...createForm.register(`items.${idx}.quantity`)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min={0.0001} step={0.0001} className="h-7 text-xs text-right" {...createForm.register(`items.${idx}.unitCost`)} />
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
              <Button type="submit" disabled={createForm.formState.isSubmitting}>Criar OC</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Dialog — receber NF */}
      <Dialog open={!!receberOrder} onOpenChange={(o) => { if (!o) setReceberOrder(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receber NF — {receberOrder?.number}</DialogTitle>
            <DialogDescription>
              Informe os dados da nota fiscal e as quantidades recebidas por item.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={receberForm.handleSubmit(onReceberSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <F label="Número da NF *" error={receberForm.formState.errors.nfNumber?.message}>
                <Input placeholder="Ex: 001234" {...receberForm.register("nfNumber")} />
              </F>
              <F label="Data da NF *" error={receberForm.formState.errors.nfDate?.message}>
                <Input type="date" {...receberForm.register("nfDate")} />
              </F>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <F label="Valor total NF (R$) *" error={receberForm.formState.errors.nfAmount?.message}>
                <Input type="number" step="0.01" min="0.01" {...receberForm.register("nfAmount")} />
              </F>
              <F label="Vencimento (título a pagar) *" error={receberForm.formState.errors.dueDate?.message}>
                <Input type="date" {...receberForm.register("dueDate")} />
              </F>
            </div>

            <F label="Depósito de destino *" error={receberForm.formState.errors.warehouseId?.message}>
              <Controller control={receberForm.control} name="warehouseId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {depositos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </F>

            {/* Itens da OC com qtd recebida editável */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Itens recebidos</Label>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Produto</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 w-20">Qtd OC</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 w-24">Custo unit.</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 w-28">Qtd recebida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {receberOrder?.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-800">{item.productName}</p>
                          <p className="text-gray-400">{item.productUnit}</p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                          {item.quantity.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                          {fmt(item.unitCost)}
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            step={0.001}
                            className="h-7 text-xs text-right"
                            {...receberForm.register(`receivedQtys.${idx}.qty`)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReceberOrder(null)}>Cancelar</Button>
              <Button type="submit" disabled={receberForm.formState.isSubmitting} className="gap-2">
                <FileInput size={14} /> Registrar recebimento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
