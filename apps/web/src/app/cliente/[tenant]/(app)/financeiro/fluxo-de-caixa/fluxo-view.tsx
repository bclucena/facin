"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Button } from "@facin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { criarLancamento, excluirLancamento } from "./actions";
import type { CashFlowType } from "@facin/db";

export type CashEntry = {
  id: string;
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  accountCode: string | null;
  referenceDate: string;
  createdAt: string;
};

type ChartPoint = { date: string; Entradas: number; Saídas: number };

const entrySchema = z.object({
  description:   z.string().min(1, "Informe a descrição"),
  amount:        z.coerce.number().positive("Deve ser maior que 0"),
  type:          z.enum(["CREDIT","DEBIT"]),
  accountCode:   z.string().default(""),
  referenceDate: z.string().min(1, "Informe a data"),
});
type EntryForm = z.infer<typeof entrySchema>;

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function buildChartData(entries: CashEntry[]): ChartPoint[] {
  const map = new Map<string, ChartPoint>();
  for (const e of entries) {
    const key = new Date(e.referenceDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const pt = map.get(key) ?? { date: key, Entradas: 0, Saídas: 0 };
    if (e.type === "CREDIT") pt.Entradas = +(pt.Entradas + e.amount).toFixed(2);
    else pt.Saídas = +(pt.Saídas + e.amount).toFixed(2);
    map.set(key, pt);
  }
  return Array.from(map.values());
}

function BRLAxis(value: number) {
  return value >= 1000 ? `R$${(value / 1000).toFixed(0)}k` : `R$${value}`;
}

export function FluxoView({ entries, defaultMonth }: { entries: CashEntry[]; defaultMonth: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);

  const form = useForm<EntryForm>({
    resolver: zodResolver(entrySchema) as Resolver<EntryForm>,
    defaultValues: { description: "", amount: 0, type: "CREDIT", accountCode: "", referenceDate: new Date().toISOString().slice(0,10) },
  });

  const chartData = useMemo(() => buildChartData(entries), [entries]);

  const totalEntradas = entries.filter(e => e.type === "CREDIT").reduce((s, e) => s + e.amount, 0);
  const totalSaidas   = entries.filter(e => e.type === "DEBIT").reduce((s, e) => s + e.amount, 0);
  const saldo = totalEntradas - totalSaidas;

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  async function onSubmit(data: EntryForm) {
    try {
      await criarLancamento({ ...data, type: data.type as CashFlowType });
      toast.success("Lançamento criado");
      setSheetOpen(false);
      form.reset();
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao criar lançamento."); }
  }

  async function onDelete(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      await excluirLancamento(id);
      toast.success("Lançamento excluído");
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao excluir."); }
  }

  return (
    <>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fluxo de Caixa</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(defaultMonth + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </p>
          </div>
          <Button onClick={() => { form.reset(); setSheetOpen(true); }} className="gap-2" disabled={isPending}>
            <Plus size={16} /> Novo lançamento
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <TrendingUp size={16} />
              <span className="text-xs font-medium">Entradas</span>
            </div>
            <p className="text-xl font-bold text-green-700">{fmt(totalEntradas)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <TrendingDown size={16} />
              <span className="text-xs font-medium">Saídas</span>
            </div>
            <p className="text-xl font-bold text-red-600">{fmt(totalSaidas)}</p>
          </div>
          <div className={`rounded-xl border p-4 shadow-sm ${saldo >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Minus size={16} />
              <span className="text-xs font-medium">Saldo do período</span>
            </div>
            <p className={`text-xl font-bold ${saldo >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(saldo)}</p>
          </div>
        </div>

        {/* Gráfico */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-4">Entradas vs Saídas por dia</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={BRLAxis} tick={{ fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Entradas" fill="#15803d" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Saídas"   fill="#dc2626" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Lista de lançamentos */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-sm text-gray-400">
                    Nenhum lançamento no período.
                  </TableCell>
                </TableRow>
              ) : entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm whitespace-nowrap text-gray-500">
                    {new Date(e.referenceDate).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{e.description}</TableCell>
                  <TableCell className="text-xs text-gray-400">{e.accountCode || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={e.type === "CREDIT" ? "border-green-400 text-green-700 bg-green-50" : "border-red-300 text-red-600 bg-red-50"}>
                      {e.type === "CREDIT" ? "Crédito" : "Débito"}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums ${e.type === "CREDIT" ? "text-green-700" : "text-red-600"}`}>
                    {e.type === "CREDIT" ? "+" : "−"}{fmt(e.amount)}
                  </TableCell>
                  <TableCell>
                    <button onClick={() => onDelete(e.id)} className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Sheet — novo lançamento */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) setSheetOpen(false); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="px-6">
            <SheetTitle>Novo lançamento</SheetTitle>
            <SheetDescription>Registre uma entrada ou saída manual.</SheetDescription>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6">
            <F label="Tipo *" error={form.formState.errors.type?.message}>
              <Controller control={form.control} name="type" render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {(["CREDIT","DEBIT"] as const).map((t) => (
                    <button
                      key={t} type="button"
                      onClick={() => field.onChange(t)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors
                        ${field.value === t
                          ? t === "CREDIT" ? "bg-green-50 border-green-500 text-green-700" : "bg-red-50 border-red-400 text-red-700"
                          : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                    >
                      {t === "CREDIT" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {t === "CREDIT" ? "Entrada" : "Saída"}
                    </button>
                  ))}
                </div>
              )} />
            </F>
            <F label="Descrição *" error={form.formState.errors.description?.message}>
              <Input placeholder="Ex: Venda à vista" {...form.register("description")} />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Valor (R$) *" error={form.formState.errors.amount?.message}>
                <Input type="number" min={0.01} step={0.01} placeholder="0,00" {...form.register("amount")} />
              </F>
              <F label="Data *" error={form.formState.errors.referenceDate?.message}>
                <Input type="date" {...form.register("referenceDate")} />
              </F>
            </div>
            <F label="Conta (código)">
              <Input placeholder="Ex: 1.1.1" {...form.register("accountCode")} />
            </F>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>Registrar</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
