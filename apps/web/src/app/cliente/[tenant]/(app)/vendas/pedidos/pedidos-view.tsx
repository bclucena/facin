"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, CheckCircle, Receipt, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@facin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confirmarPedido, faturarPedido, cancelarPedido } from "./actions";

const STATUS_CONFIG = {
  DRAFT:     { label: "Rascunho",   class: "border-gray-300 text-gray-500 bg-gray-50" },
  CONFIRMED: { label: "Confirmado", class: "border-blue-400 text-blue-700 bg-blue-50" },
  INVOICED:  { label: "Faturado",   class: "border-green-400 text-green-700 bg-green-50" },
  CANCELLED: { label: "Cancelado",  class: "border-red-300 text-red-600 bg-red-50" },
};

type OrderRow = {
  id: string; number: string; clientName: string;
  issueDate: string; deliveryDate: string | null;
  status: string; subtotal: number; discountTotal: number;
  total: number; itemCount: number; notes: string | null;
};
type DepositoOption = { id: string; nome: string };

const faturarSchema = z.object({
  warehouseId: z.string().min(1, "Selecione o depósito"),
  dueDate: z.string().min(1, "Informe o vencimento"),
});
type FaturarValues = z.infer<typeof faturarSchema>;

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
const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

export function PedidosView({ orders, depositos, tenantSlug }: { orders: OrderRow[]; depositos: DepositoOption[]; tenantSlug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [faturarOrder, setFaturarOrder] = useState<OrderRow | null>(null);

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const faturarForm = useForm<FaturarValues>({
    resolver: zodResolver(faturarSchema),
    defaultValues: { warehouseId: depositos[0]?.id ?? "", dueDate: in30 },
  });

  function openFaturar(order: OrderRow) {
    setFaturarOrder(order);
    faturarForm.reset({
      warehouseId: depositos[0]?.id ?? "",
      dueDate: order.deliveryDate ? order.deliveryDate.slice(0, 10) : in30,
    });
  }

  async function onConfirmar(id: string) {
    if (!confirm("Confirmar este pedido?")) return;
    try {
      await confirmarPedido(tenantSlug, id);
      toast.success("Pedido confirmado");
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao confirmar."); }
  }

  async function onFaturar(data: FaturarValues) {
    if (!faturarOrder) return;
    try {
      await faturarPedido(tenantSlug, { orderId: faturarOrder.id, warehouseId: data.warehouseId, dueDate: data.dueDate });
      toast.success("Pedido faturado — estoque e CR atualizados");
      setFaturarOrder(null);
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao faturar.");
    }
  }

  async function onCancelar(id: string) {
    if (!confirm("Cancelar este pedido? Esta ação não desfaz integrações já realizadas.")) return;
    try {
      await cancelarPedido(tenantSlug, id);
      toast.success("Pedido cancelado");
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao cancelar."); }
  }

  const totals = {
    total: orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0),
    draft: orders.filter((o) => o.status === "DRAFT").length,
    confirmed: orders.filter((o) => o.status === "CONFIRMED").length,
    invoiced: orders.filter((o) => o.status === "INVOICED").length,
  };

  return (
    <>
      <div className="space-y-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedidos de Venda</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {orders.length} pedidos — {totals.draft} rascunho · {totals.confirmed} confirmado · {totals.invoiced} faturado
            </p>
          </div>
          <Link href="/vendas/pedidos/novo">
            <Button className="gap-2" disabled={isPending}>
              <Plus size={16} /> Novo pedido
            </Button>
          </Link>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Em aberto", value: fmt(orders.filter((o) => ["DRAFT","CONFIRMED"].includes(o.status)).reduce((s,o)=>s+o.total,0)), color: "text-blue-700" },
            { label: "Faturado (mês)", value: fmt(orders.filter((o) => o.status === "INVOICED").reduce((s,o)=>s+o.total,0)), color: "text-green-700" },
            { label: "Total (ativos)", value: fmt(totals.total), color: "text-gray-900" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{k.label}</p>
              <p className={`text-xl font-bold mt-1 tabular-nums ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Itens</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-44">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-sm text-gray-400">
                    Nenhum pedido encontrado.{" "}
                    <Link href="/vendas/pedidos/novo" className="text-[#0F5132] underline underline-offset-2">
                      Criar primeiro pedido
                    </Link>
                  </TableCell>
                </TableRow>
              ) : orders.map((o) => {
                const cfg = STATUS_CONFIG[o.status as keyof typeof STATUS_CONFIG];
                return (
                  <TableRow key={o.id} className={o.status === "CANCELLED" ? "opacity-50" : ""}>
                    <TableCell className="font-mono text-sm font-medium">{o.number}</TableCell>
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {new Date(o.issueDate).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{o.clientName}</TableCell>
                    <TableCell className="text-center text-sm text-gray-500">{o.itemCount}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmt(o.total)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cfg.class}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {o.status === "DRAFT" && (
                          <button
                            onClick={() => onConfirmar(o.id)}
                            title="Confirmar pedido"
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <CheckCircle size={11} /> Confirmar
                          </button>
                        )}
                        {o.status === "CONFIRMED" && (
                          <button
                            onClick={() => openFaturar(o)}
                            title="Faturar pedido"
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-[#0F5132] text-white hover:bg-[#0d4429] transition-colors"
                          >
                            <Receipt size={11} /> Faturar
                          </button>
                        )}
                        {(o.status === "DRAFT" || o.status === "CONFIRMED") && (
                          <button
                            onClick={() => onCancelar(o.id)}
                            title="Cancelar pedido"
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <XCircle size={13} />
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

      {/* Dialog — faturar */}
      <Dialog open={!!faturarOrder} onOpenChange={(o) => { if (!o) setFaturarOrder(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Faturar — {faturarOrder?.number}</DialogTitle>
            <DialogDescription>
              Informe o depósito de origem e o vencimento do título a receber.
              O estoque será debitado e uma CR será criada automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={faturarForm.handleSubmit(onFaturar)} className="space-y-4">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm">
              <p className="text-gray-500">Cliente</p>
              <p className="font-medium text-gray-800">{faturarOrder?.clientName}</p>
              <p className="text-gray-500 mt-2">Valor total</p>
              <p className="font-bold text-gray-900">{fmt(faturarOrder?.total ?? 0)}</p>
            </div>

            <F label="Depósito de origem *" error={faturarForm.formState.errors.warehouseId?.message}>
              <Controller control={faturarForm.control} name="warehouseId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {depositos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </F>

            <F label="Vencimento (título a receber) *" error={faturarForm.formState.errors.dueDate?.message}>
              <Input type="date" {...faturarForm.register("dueDate")} />
            </F>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFaturarOrder(null)}>Cancelar</Button>
              <Button type="submit" disabled={faturarForm.formState.isSubmitting}>
                Faturar pedido
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
