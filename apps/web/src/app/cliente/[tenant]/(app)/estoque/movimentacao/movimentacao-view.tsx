"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ArrowUpCircle, ArrowDownCircle, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@facin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { registrarMovimentacao } from "./actions";

const ACCOUNT_LABELS: Record<string, string> = { ESTOQUE_NF: "Estoque NF", ESTOQUE: "Estoque", ESTOQUE_FISICO: "Estoque Físico" };

export type MovementRow = {
  id: string; productCode: string; productName: string; productUnit: string;
  warehouseName: string; accountType: string; movementType: string;
  quantity: number; lot: string | null; expiryDate: string | null;
  notes: string | null; createdAt: string;
};

type ProdutoOption = { id: string; codigo: string; descricao: string; unidade: string };
type DepositoOption = { id: string; nome: string };

const schema = z.object({
  productId:    z.string().min(1, "Selecione o produto"),
  warehouseId:  z.string().min(1, "Selecione o depósito"),
  accountType:  z.enum(["ESTOQUE_NF", "ESTOQUE", "ESTOQUE_FISICO"]),
  movementType: z.enum(["ENTRADA", "SAIDA"]),
  quantity:     z.coerce.number().positive("Deve ser maior que 0"),
  lot:              z.string().default(""),
  manufacturingDate: z.string().default(""),
  expiryDate:   z.string().default(""),
  notes:        z.string().default(""),
});
type MovForm = z.infer<typeof schema>;

const DEFAULT: MovForm = {
  productId: "", warehouseId: "", accountType: "ESTOQUE", movementType: "ENTRADA",
  quantity: 0, lot: "", manufacturingDate: "", expiryDate: "", notes: "",
};

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function MovimentacaoView({
  movements, produtos, depositos, tenantSlug,
}: { movements: MovementRow[]; produtos: ProdutoOption[]; depositos: DepositoOption[]; tenantSlug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const form = useForm<MovForm>({ resolver: zodResolver(schema) as Resolver<MovForm>, defaultValues: DEFAULT });
  const movType = form.watch("movementType");

  const filtered = movements.filter((m) => {
    if (dateFrom && m.createdAt < dateFrom) return false;
    if (dateTo && m.createdAt > dateTo + "T23:59:59") return false;
    return true;
  });

  async function onSubmit(data: MovForm) {
    try {
      await registrarMovimentacao(tenantSlug, {
        productId: data.productId,
        warehouseId: data.warehouseId,
        accountType: data.accountType as "ESTOQUE_NF" | "ESTOQUE" | "ESTOQUE_FISICO",
        movementType: data.movementType as "ENTRADA" | "SAIDA",
        quantity: data.quantity,
        lot: data.lot || undefined,
        manufacturingDate: data.manufacturingDate || null,
        expiryDate: data.expiryDate || null,
        notes: data.notes || undefined,
      });
      toast.success(`${data.movementType === "ENTRADA" ? "Entrada" : "Saída"} registrada`);
      setSheetOpen(false);
      form.reset(DEFAULT);
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao registrar movimentação."); }
  }

  return (
    <>
      <div className="space-y-4 max-w-6xl">
        <div className="flex items-center gap-3">
          <Link href={`/cliente/${tenantSlug}/estoque`} className="text-gray-400 hover:text-gray-600">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Movimentações</h1>
            <p className="text-sm text-gray-500 mt-0.5">Entradas e saídas de estoque</p>
          </div>
          <Button onClick={() => { form.reset(DEFAULT); setSheetOpen(true); }} className="gap-2" disabled={isPending}>
            <Plus size={16} /> Nova movimentação
          </Button>
        </div>

        {/* Filtro por período */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Período:</span>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          <span className="text-gray-400">até</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Limpar</Button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Depósito</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-gray-400">
                    Nenhuma movimentação registrada.
                  </TableCell>
                </TableRow>
              ) : filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.movementType === "ENTRADA" ? "success" : "destructive"} className="gap-1">
                      {m.movementType === "ENTRADA"
                        ? <ArrowUpCircle size={11} />
                        : <ArrowDownCircle size={11} />}
                      {m.movementType === "ENTRADA" ? "Entrada" : "Saída"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{m.productName}</div>
                    <div className="text-xs text-gray-400 font-mono">{m.productCode}</div>
                  </TableCell>
                  <TableCell className="text-sm">{m.warehouseName}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                      {ACCOUNT_LABELS[m.accountType]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    <span className={m.movementType === "ENTRADA" ? "text-green-700" : "text-red-600"}>
                      {m.movementType === "ENTRADA" ? "+" : "−"}
                      {m.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{m.productUnit}</span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{m.lot || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-xs truncate">{m.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) setSheetOpen(false); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="px-6">
            <SheetTitle>Nova movimentação</SheetTitle>
            <SheetDescription>Registre uma entrada ou saída de estoque.</SheetDescription>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6">
            {/* Tipo */}
            <F label="Tipo *" error={form.formState.errors.movementType?.message}>
              <Controller control={form.control} name="movementType" render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {(["ENTRADA", "SAIDA"] as const).map((t) => (
                    <button
                      key={t} type="button"
                      onClick={() => field.onChange(t)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors
                        ${field.value === t
                          ? t === "ENTRADA" ? "bg-green-50 border-green-500 text-green-700" : "bg-red-50 border-red-400 text-red-700"
                          : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                    >
                      {t === "ENTRADA" ? <ArrowUpCircle size={15} /> : <ArrowDownCircle size={15} />}
                      {t === "ENTRADA" ? "Entrada" : "Saída"}
                    </button>
                  ))}
                </div>
              )} />
            </F>

            {/* Produto */}
            <F label="Produto *" error={form.formState.errors.productId?.message}>
              <Controller control={form.control} name="productId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.descricao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </F>

            <div className="grid grid-cols-2 gap-3">
              {/* Depósito */}
              <F label="Depósito *" error={form.formState.errors.warehouseId?.message}>
                <Controller control={form.control} name="warehouseId" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {depositos.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </F>

              {/* Conta */}
              <F label="Conta de estoque">
                <Controller control={form.control} name="accountType" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESTOQUE_NF">Estoque NF</SelectItem>
                      <SelectItem value="ESTOQUE">Estoque</SelectItem>
                      <SelectItem value="ESTOQUE_FISICO">Estoque Físico</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </F>
            </div>

            {/* Quantidade */}
            <F label="Quantidade *" error={form.formState.errors.quantity?.message}>
              <Input type="number" min={0.001} step={0.001} placeholder="0" {...form.register("quantity")} />
            </F>

            {/* Lote */}
            <F label="Lote">
              <Input placeholder="Ex: L240601" className="uppercase" {...form.register("lot")} />
            </F>

            <div className="grid grid-cols-2 gap-3">
              <F label="Data de fabricação">
                <Input type="date" {...form.register("manufacturingDate")} />
              </F>
              <F label="Data de validade" error={form.formState.errors.expiryDate?.message}>
                <Input type="date" {...form.register("expiryDate")}
                  className={movType === "ENTRADA" ? "" : "opacity-50 pointer-events-none"} />
              </F>
            </div>

            <F label="Observação">
              <Input placeholder="Opcional" {...form.register("notes")} />
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
