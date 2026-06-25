"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowDownCircle } from "lucide-react";
import { Button } from "@facin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { criarContaReceber, editarContaReceber, excluirContaReceber, registrarBaixaReceber } from "./actions";
import type { PaymentType } from "@facin/db";

const PAYMENT_LABELS: Record<string, string> = {
  BOLETO: "Boleto", PIX: "PIX", CHEQUE: "Cheque",
  PROMISSORIA: "Promissória", TED: "TED", DINHEIRO: "Dinheiro",
};

export type BillRow = {
  id: string;
  clientName: string;
  description: string;
  amount: number;
  dueDate: string;
  receivedAt: string | null;
  receivedAmount: number | null;
  paymentType: string | null;
  status: string;
  notes: string | null;
};

type ClienteOption = { id: string; nome: string };
type DisplayStatus = "overdue" | "pending" | "paid";

function getDisplayStatus(status: string, dueDate: string): DisplayStatus {
  if (status === "PAID") return "paid";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  return due < today ? "overdue" : "pending";
}

const STATUS_BADGE = {
  overdue: { label: "Vencido",  class: "border-transparent bg-destructive text-destructive-foreground" },
  pending: { label: "A receber", class: "border-amber-400 text-amber-700 bg-amber-50" },
  paid:    { label: "Recebido", class: "border-green-400 text-green-700 bg-green-50" },
};

const billSchema = z.object({
  clientName:  z.string().min(1, "Informe o cliente"),
  description: z.string().min(1, "Informe a descrição"),
  amount:      z.coerce.number().positive("Deve ser maior que 0"),
  dueDate:     z.string().min(1, "Informe o vencimento"),
  notes:       z.string().default(""),
});
type BillForm = z.infer<typeof billSchema>;

const baixaSchema = z.object({
  receivedAt:     z.string().min(1, "Informe a data"),
  receivedAmount: z.coerce.number().positive("Deve ser maior que 0"),
  paymentType:    z.enum(["BOLETO","PIX","CHEQUE","PROMISSORIA","TED","DINHEIRO"]),
});
type BaixaForm = z.infer<typeof baixaSchema>;

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function ContasReceberView({ bills, clientes }: { bills: BillRow[]; clientes: ClienteOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editing, setEditing] = useState<BillRow | null>(null);
  const [paying, setPaying] = useState<BillRow | null>(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [search, setSearch] = useState("");

  const billForm = useForm<BillForm>({ resolver: zodResolver(billSchema), defaultValues: { clientName: "", description: "", amount: 0, dueDate: "", notes: "" } });
  const baixaForm = useForm<BaixaForm>({ resolver: zodResolver(baixaSchema), defaultValues: { receivedAt: new Date().toISOString().slice(0,10), receivedAmount: 0, paymentType: "PIX" } });

  function openCreate() {
    setEditing(null);
    billForm.reset({ clientName: "", description: "", amount: 0, dueDate: "", notes: "" });
    setSheetOpen(true);
  }
  function openEdit(b: BillRow) {
    setEditing(b);
    billForm.reset({ clientName: b.clientName, description: b.description, amount: b.amount, dueDate: b.dueDate.slice(0,10), notes: b.notes ?? "" });
    setSheetOpen(true);
  }
  function openReceive(b: BillRow) {
    setPaying(b);
    baixaForm.reset({ receivedAt: new Date().toISOString().slice(0,10), receivedAmount: b.amount, paymentType: "PIX" });
    setPayOpen(true);
  }

  const filtered = bills.filter((b) => {
    const ds = getDisplayStatus(b.status, b.dueDate);
    if (filterStatus !== "ALL" && ds !== filterStatus) return false;
    if (filterFrom && b.dueDate < filterFrom) return false;
    if (filterTo && b.dueDate > filterTo + "T23:59:59") return false;
    if (search && !b.clientName.toLowerCase().includes(search.toLowerCase()) && !b.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totals = {
    total:    filtered.reduce((s, b) => s + b.amount, 0),
    pending:  filtered.filter(b => b.status === "PENDING").reduce((s, b) => s + b.amount, 0),
    received: filtered.filter(b => b.status === "PAID").reduce((s, b) => s + (b.receivedAmount ?? b.amount), 0),
  };

  async function onSubmit(data: BillForm) {
    try {
      if (editing) {
        await editarContaReceber(editing.id, data);
        toast.success("Conta atualizada");
      } else {
        await criarContaReceber(data);
        toast.success("Conta criada");
      }
      setSheetOpen(false);
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao salvar conta."); }
  }

  async function onDelete(id: string) {
    if (!confirm("Excluir esta conta?")) return;
    try {
      await excluirContaReceber(id);
      toast.success("Conta excluída");
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao excluir."); }
  }

  async function onReceive(data: BaixaForm) {
    if (!paying) return;
    try {
      await registrarBaixaReceber({ id: paying.id, receivedAt: data.receivedAt, receivedAmount: data.receivedAmount, paymentType: data.paymentType as PaymentType });
      toast.success("Recebimento registrado");
      setPayOpen(false);
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao registrar recebimento."); }
  }

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <>
      <div className="space-y-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contas a Receber</h1>
            <p className="text-sm text-gray-500 mt-0.5">{bills.length} títulos</p>
          </div>
          <Button onClick={openCreate} className="gap-2" disabled={isPending}>
            <Plus size={16} /> Nova conta
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total no filtro",  value: totals.total,    color: "text-gray-900" },
            { label: "A receber",        value: totals.pending,  color: "text-amber-700" },
            { label: "Recebido",         value: totals.received, color: "text-green-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-xl font-bold mt-1 ${color}`}>{fmt(value)}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <Input placeholder="Buscar cliente ou descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-48 max-w-xs" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="pending">A receber</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
              <SelectItem value="paid">Recebido</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="w-40" />
          <span className="self-center text-gray-400 text-sm">até</span>
          <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="w-40" />
          {(filterFrom || filterTo || filterStatus !== "ALL" || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterFrom(""); setFilterTo(""); setFilterStatus("ALL"); setSearch(""); }}>Limpar</Button>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-36">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-16 text-center text-sm text-gray-400">Nenhum título encontrado.</TableCell></TableRow>
              ) : filtered.map((b) => {
                const ds = getDisplayStatus(b.status, b.dueDate);
                return (
                  <TableRow key={b.id} className={ds === "overdue" ? "bg-red-50/40" : undefined}>
                    <TableCell className="text-sm whitespace-nowrap">{new Date(b.dueDate).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-medium text-sm">{b.clientName}</TableCell>
                    <TableCell className="text-sm text-gray-600">{b.description}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmt(b.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_BADGE[ds].class}>{STATUS_BADGE[ds].label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {b.status === "PENDING" && (
                          <button
                            onClick={() => openReceive(b)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-green-700 text-white hover:bg-green-800 transition-colors"
                          >
                            <ArrowDownCircle size={11} /> Receber
                          </button>
                        )}
                        {b.status === "PENDING" && (
                          <button onClick={() => openEdit(b)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                            <Pencil size={13} />
                          </button>
                        )}
                        <button onClick={() => onDelete(b.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Sheet — criar/editar */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) setSheetOpen(false); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="px-6">
            <SheetTitle>{editing ? "Editar conta" : "Nova conta a receber"}</SheetTitle>
            <SheetDescription>Preencha os dados do título.</SheetDescription>
          </SheetHeader>
          <form onSubmit={billForm.handleSubmit(onSubmit)} className="space-y-4 px-6">
            <F label="Cliente *" error={billForm.formState.errors.clientName?.message}>
              <Input placeholder="Nome do cliente" {...billForm.register("clientName")} list="clientes-list" />
              <datalist id="clientes-list">
                {clientes.map((c) => <option key={c.id} value={c.nome} />)}
              </datalist>
            </F>
            <F label="Descrição *" error={billForm.formState.errors.description?.message}>
              <Input placeholder="Ex: Venda #1042" {...billForm.register("description")} />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Valor (R$) *" error={billForm.formState.errors.amount?.message}>
                <Input type="number" min={0.01} step={0.01} placeholder="0,00" {...billForm.register("amount")} />
              </F>
              <F label="Vencimento *" error={billForm.formState.errors.dueDate?.message}>
                <Input type="date" {...billForm.register("dueDate")} />
              </F>
            </div>
            <F label="Observação">
              <Input placeholder="Opcional" {...billForm.register("notes")} />
            </F>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={billForm.formState.isSubmitting}>{editing ? "Salvar" : "Criar"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Dialog — registrar recebimento */}
      <Dialog open={payOpen} onOpenChange={(o) => { if (!o) setPayOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar recebimento</DialogTitle>
            <DialogDescription>
              {paying?.clientName} — {paying ? fmt(paying.amount) : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={baixaForm.handleSubmit(onReceive)} className="space-y-4">
            <F label="Data do recebimento *" error={baixaForm.formState.errors.receivedAt?.message}>
              <Input type="date" {...baixaForm.register("receivedAt")} />
            </F>
            <F label="Valor recebido (R$) *" error={baixaForm.formState.errors.receivedAmount?.message}>
              <Input type="number" min={0.01} step={0.01} {...baixaForm.register("receivedAmount")} />
            </F>
            <F label="Forma de recebimento *" error={baixaForm.formState.errors.paymentType?.message}>
              <Controller control={baixaForm.control} name="paymentType" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </F>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={baixaForm.formState.isSubmitting}>Confirmar recebimento</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
