"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@facin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confirmarInventario } from "./actions";

type ProdutoOption  = { id: string; codigo: string; descricao: string; unidade: string };
type DepositoOption = { id: string; nome: string };
type BalanceRecord  = { productId: string; warehouseId: string; accountType: string; quantity: number };

const ACCOUNT_LABELS: Record<string, string> = { ESTOQUE_NF: "Estoque NF", ESTOQUE: "Estoque", ESTOQUE_FISICO: "Estoque Físico" };

type WizardItem = { productId: string; codigo: string; descricao: string; unidade: string; systemQty: number; countedQty: number };

export function InventarioView({
  depositos, produtos, balances, tenantSlug,
}: { depositos: DepositoOption[]; produtos: ProdutoOption[]; balances: BalanceRecord[]; tenantSlug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [warehouseId, setWarehouseId] = useState("");
  const [accountType, setAccountType] = useState<"ESTOQUE_NF" | "ESTOQUE" | "ESTOQUE_FISICO">("ESTOQUE");
  const [items, setItems] = useState<WizardItem[]>([]);

  function buildItems() {
    // Inclui apenas produtos com saldo na posição selecionada
    const posBalances = balances.filter((b) => b.warehouseId === warehouseId && b.accountType === accountType);
    const mapped = posBalances.map((b) => {
      const p = produtos.find((p) => p.id === b.productId)!;
      return { productId: p.id, codigo: p.codigo, descricao: p.descricao, unidade: p.unidade, systemQty: b.quantity, countedQty: b.quantity };
    });
    // Ordena por descrição
    return mapped.sort((a, b) => a.descricao.localeCompare(b.descricao));
  }

  function goToStep2() {
    if (!warehouseId) { toast.error("Selecione o depósito."); return; }
    const built = buildItems();
    if (built.length === 0) { toast.error("Nenhum produto com saldo nessa posição."); return; }
    setItems(built);
    setStep(2);
  }

  function updateQty(productId: string, value: string) {
    const n = parseFloat(value);
    setItems((prev) => prev.map((it) => it.productId === productId ? { ...it, countedQty: isNaN(n) ? 0 : n } : it));
  }

  const divergencias = items.filter((it) => it.countedQty !== it.systemQty);
  const warehouseName = depositos.find((d) => d.id === warehouseId)?.nome ?? "";

  async function handleConfirm() {
    try {
      await confirmarInventario(tenantSlug, {
        warehouseId,
        accountType: accountType as "ESTOQUE_NF" | "ESTOQUE" | "ESTOQUE_FISICO",
        items: items.map((it) => ({ productId: it.productId, systemQty: it.systemQty, countedQty: it.countedQty })),
      });
      toast.success("Inventário confirmado e saldos atualizados.");
      startTransition(() => router.refresh());
      // Reset wizard
      setStep(1);
      setWarehouseId("");
      setAccountType("ESTOQUE");
      setItems([]);
    } catch { toast.error("Erro ao confirmar inventário."); }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/cliente/${tenantSlug}/estoque`} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventário</h1>
          <p className="text-sm text-gray-500 mt-0.5">Contagem e ajuste de saldo</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((s, i) => (
          <Fragment key={s}>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                step === s ? "bg-[#0F5132] text-white" : step > s ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
              }`}
            >
              {step > s ? <CheckCircle2 size={14} /> : <span className="w-4 text-center">{s}</span>}
              {s === 1 ? "Configuração" : s === 2 ? "Contagem" : "Revisão"}
            </div>
            {i < 2 && <div className={`flex-1 h-px ${step > s ? "bg-green-300" : "bg-gray-200"}`} />}
          </Fragment>
        ))}
      </div>

      {/* Step 1 — Configuração */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-800">Selecione o depósito e conta de estoque</h2>
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Depósito *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {depositos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Conta de estoque</Label>
              <Select value={accountType} onValueChange={(v) => setAccountType(v as typeof accountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ESTOQUE_NF">Estoque NF</SelectItem>
                  <SelectItem value="ESTOQUE">Estoque</SelectItem>
                  <SelectItem value="ESTOQUE_FISICO">Estoque Físico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={goToStep2} className="gap-2">
            Iniciar contagem <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* Step 2 — Contagem */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
            Contagem de <strong>{warehouseName}</strong> · {ACCOUNT_LABELS[accountType]} ·{" "}
            <strong>{items.length}</strong> produtos
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Saldo sistema</TableHead>
                  <TableHead className="text-right w-36">Qtd contada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.productId}>
                    <TableCell className="font-medium">{it.descricao}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{it.codigo}</TableCell>
                    <TableCell className="text-right tabular-nums text-gray-500">
                      {it.systemQty.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {it.unidade}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number" min={0} step={0.001}
                        value={it.countedQty}
                        onChange={(e) => updateQty(it.productId, e.target.value)}
                        className={`text-right w-28 ml-auto tabular-nums ${it.countedQty !== it.systemQty ? "border-amber-400 bg-amber-50" : ""}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
            <Button onClick={() => setStep(3)} className="gap-2">
              Revisar divergências <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Revisão */}
      {step === 3 && (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
            divergencias.length === 0 ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"
          }`}>
            {divergencias.length === 0
              ? <><CheckCircle2 size={16} /> Nenhuma divergência — saldos conferem com o sistema.</>
              : <><AlertCircle size={16} /> {divergencias.length} produto{divergencias.length > 1 ? "s" : ""} com divergência.</>}
          </div>

          {divergencias.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Sistema</TableHead>
                    <TableHead className="text-right">Contado</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {divergencias.map((it) => {
                    const diff = it.countedQty - it.systemQty;
                    return (
                      <TableRow key={it.productId}>
                        <TableCell>
                          <div className="font-medium">{it.descricao}</div>
                          <div className="text-xs text-gray-400 font-mono">{it.codigo}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-gray-500">
                          {it.systemQty.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {it.unidade}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {it.countedQty.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {it.unidade}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          <Badge variant={diff > 0 ? "success" : "destructive"}>
                            {diff > 0 ? "+" : ""}{diff.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {it.unidade}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {divergencias.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade confirmada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.productId}>
                      <TableCell className="font-medium">{it.descricao} <span className="text-xs text-gray-400 ml-1 font-mono">{it.codigo}</span></TableCell>
                      <TableCell className="text-right tabular-nums">
                        {it.countedQty.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {it.unidade}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Voltar e corrigir</Button>
            <Button onClick={handleConfirm} disabled={isPending} className="gap-2 bg-[#0F5132] hover:bg-[#0d4429]">
              <CheckCircle2 size={16} />
              {isPending ? "Confirmando..." : "Confirmar inventário"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
