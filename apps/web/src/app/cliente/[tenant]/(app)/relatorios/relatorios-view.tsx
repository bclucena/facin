"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
import { Button } from "@facin/ui";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ── Types ─────────────────────────────────────────────────────────────────────

type CashFlowRow = {
  id: string; description: string; amount: number;
  type: "CREDIT" | "DEBIT"; accountCode: string; referenceDate: string;
};
type StockRow = {
  id: string; productCode: string; productName: string; productUnit: string;
  productMinStock: number; warehouseName: string; accountType: string;
  quantity: number; qtyCommitted: number; qtyAvailable: number;
};
type SalesOrderRow = {
  id: string; number: string; clientName: string;
  issueDate: string; status: string; itemCount: number; total: number;
};
type OverdueRow = {
  id: string; clientName: string; description: string;
  amount: number; dueDate: string; daysOverdue: number;
};

type Tab = "financeiro" | "estoque" | "pedidos" | "inadimplencia";

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}
function fmtQty(v: number, unit: string) {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} ${unit}`;
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(";"),
    ...rows.map((r) =>
      headers.map((h) => String(r[h] ?? "").replace(/;/g, ",")).join(";")
    ),
  ].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color = "neutral",
}: {
  label: string; value: string; sub?: string; color?: "green" | "red" | "neutral";
}) {
  const cls = color === "green" ? "text-green-600" : color === "red" ? "text-red-600" : "text-gray-900";
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${cls}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function DateFilter({
  from, to, onFilter,
}: {
  from: string; to: string; onFilter: (f: string, t: string) => void;
}) {
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">De</Label>
        <Input type="date" value={f} onChange={(e) => setF(e.target.value)} className="h-8 text-sm w-36" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Até</Label>
        <Input type="date" value={t} onChange={(e) => setT(e.target.value)} className="h-8 text-sm w-36" />
      </div>
      <Button size="sm" onClick={() => onFilter(f, t)} className="h-8">Filtrar</Button>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "success" | "destructive" }> = {
    DRAFT: { label: "Rascunho", variant: "secondary" },
    CONFIRMED: { label: "Confirmado", variant: "default" },
    INVOICED: { label: "Faturado", variant: "success" },
    CANCELLED: { label: "Cancelado", variant: "destructive" },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "secondary" };
  return <Badge variant={variant}>{label}</Badge>;
}

function EmptyRow({ cols, msg }: { cols: number; msg: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-12 text-center text-sm text-gray-400">{msg}</TableCell>
    </TableRow>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "financeiro", label: "Resumo Financeiro" },
  { id: "estoque", label: "Posição de Estoque" },
  { id: "pedidos", label: "Pedidos por Período" },
  { id: "inadimplencia", label: "Inadimplência" },
];

// ── Main view ─────────────────────────────────────────────────────────────────

export function RelatoriosView({
  tenantSlug: _tenantSlug,
  from,
  to,
  cashFlows,
  stockBalances,
  salesOrders,
  overdueAR,
}: {
  tenantSlug: string;
  from: string;
  to: string;
  cashFlows: CashFlowRow[];
  stockBalances: StockRow[];
  salesOrders: SalesOrderRow[];
  overdueAR: OverdueRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<Tab>("financeiro");

  function applyFilter(f: string, t: string) {
    router.push(`${pathname}?from=${f}&to=${t}`);
  }

  // ── KPIs ──
  const totalEntradas = cashFlows.filter((e) => e.type === "CREDIT").reduce((s, e) => s + e.amount, 0);
  const totalSaidas = cashFlows.filter((e) => e.type === "DEBIT").reduce((s, e) => s + e.amount, 0);
  const saldo = totalEntradas - totalSaidas;

  const totalPedidos = salesOrders.length;
  const totalFaturado = salesOrders.reduce((s, o) => s + o.total, 0);
  const ticketMedio = totalPedidos > 0 ? totalFaturado / totalPedidos : 0;

  const totalAberto = overdueAR.reduce((s, r) => s + r.amount, 0);
  const totalVencido30 = overdueAR.filter((r) => r.daysOverdue > 30).reduce((s, r) => s + r.amount, 0);
  const clientesInadimplentes = new Set(overdueAR.map((r) => r.clientName)).size;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-sm text-gray-500 mt-0.5">Visão consolidada do negócio</p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Resumo Financeiro ── */}
      {activeTab === "financeiro" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DateFilter from={from} to={to} onFilter={applyFilter} />
            <Button
              size="sm" variant="outline" className="h-8 gap-1.5"
              onClick={() =>
                downloadCSV(`financeiro-${from}-${to}.csv`, cashFlows.map((e) => ({
                  Data: fmtDate(e.referenceDate),
                  Descrição: e.description,
                  Tipo: e.type === "CREDIT" ? "Entrada" : "Saída",
                  Conta: e.accountCode,
                  Valor: e.amount.toFixed(2).replace(".", ","),
                })))
              }
            >
              <Download size={13} /> Exportar CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Total entradas" value={fmtBRL(totalEntradas)} color="green" />
            <KpiCard label="Total saídas" value={fmtBRL(totalSaidas)} color="red" />
            <KpiCard label="Saldo do período" value={fmtBRL(saldo)} color={saldo >= 0 ? "green" : "red"} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashFlows.length === 0
                  ? <EmptyRow cols={4} msg="Nenhum lançamento no período." />
                  : cashFlows.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm tabular-nums">{fmtDate(e.referenceDate)}</TableCell>
                      <TableCell className="text-sm">{e.description}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${e.type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                          {e.type === "CREDIT" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {e.type === "CREDIT" ? "Entrada" : "Saída"}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${e.type === "CREDIT" ? "text-green-700" : "text-red-700"}`}>
                        {fmtBRL(e.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Posição de Estoque ── */}
      {activeTab === "estoque" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm" variant="outline" className="h-8 gap-1.5"
              onClick={() =>
                downloadCSV(`estoque-${new Date().toISOString().slice(0, 10)}.csv`, stockBalances.map((b) => ({
                  Código: b.productCode,
                  Produto: b.productName,
                  Unidade: b.productUnit,
                  Depósito: b.warehouseName,
                  Conta: b.accountType,
                  "Qtd Disponível": b.qtyAvailable.toFixed(3).replace(".", ","),
                  "Qtd Comprometida": b.qtyCommitted.toFixed(3).replace(".", ","),
                  "Estoque Mínimo": b.productMinStock.toFixed(3).replace(".", ","),
                  Status: b.qtyAvailable < b.productMinStock ? "Crítico" : "OK",
                })))
              }
            >
              <Download size={13} /> Exportar CSV
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Disponível</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockBalances.length === 0
                  ? <EmptyRow cols={7} msg="Nenhum saldo de estoque encontrado." />
                  : stockBalances.map((b) => {
                    const isCritical = b.qtyAvailable < b.productMinStock;
                    return (
                      <TableRow key={b.id} className={isCritical ? "bg-red-50" : undefined}>
                        <TableCell className="font-mono text-xs text-gray-500">{b.productCode}</TableCell>
                        <TableCell className={`font-medium text-sm ${isCritical ? "text-red-700" : ""}`}>{b.productName}</TableCell>
                        <TableCell className="text-sm text-gray-600">{b.warehouseName}</TableCell>
                        <TableCell className="text-xs text-gray-400">{b.accountType}</TableCell>
                        <TableCell className={`text-right tabular-nums text-sm ${isCritical ? "text-red-700 font-semibold" : ""}`}>
                          {fmtQty(b.qtyAvailable, b.productUnit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-gray-500">
                          {b.productMinStock.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isCritical ? "destructive" : "success"}>
                            {isCritical ? "Crítico" : "OK"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Pedidos por Período ── */}
      {activeTab === "pedidos" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DateFilter from={from} to={to} onFilter={applyFilter} />
            <Button
              size="sm" variant="outline" className="h-8 gap-1.5"
              onClick={() =>
                downloadCSV(`pedidos-${from}-${to}.csv`, salesOrders.map((o) => ({
                  Número: o.number,
                  Data: fmtDate(o.issueDate),
                  Cliente: o.clientName,
                  Itens: o.itemCount,
                  Total: o.total.toFixed(2).replace(".", ","),
                  Status: o.status,
                })))
              }
            >
              <Download size={13} /> Exportar CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Total de pedidos" value={String(totalPedidos)} />
            <KpiCard label="Valor total faturado" value={fmtBRL(totalFaturado)} color="green" />
            <KpiCard label="Ticket médio" value={fmtBRL(ticketMedio)} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesOrders.length === 0
                  ? <EmptyRow cols={6} msg="Nenhum pedido no período." />
                  : salesOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs text-gray-500">{o.number}</TableCell>
                      <TableCell className="text-sm tabular-nums">{fmtDate(o.issueDate)}</TableCell>
                      <TableCell className="font-medium text-sm">{o.clientName}</TableCell>
                      <TableCell className="text-right text-sm text-gray-600">{o.itemCount}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-sm">{fmtBRL(o.total)}</TableCell>
                      <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Inadimplência ── */}
      {activeTab === "inadimplencia" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm" variant="outline" className="h-8 gap-1.5"
              onClick={() =>
                downloadCSV(`inadimplencia-${new Date().toISOString().slice(0, 10)}.csv`, overdueAR.map((r) => ({
                  Cliente: r.clientName,
                  Descrição: r.description,
                  Valor: r.amount.toFixed(2).replace(".", ","),
                  Vencimento: fmtDate(r.dueDate),
                  "Dias em Atraso": r.daysOverdue,
                })))
              }
            >
              <Download size={13} /> Exportar CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Total em aberto" value={fmtBRL(totalAberto)} color="red" />
            <KpiCard
              label="Vencido há +30 dias"
              value={fmtBRL(totalVencido30)}
              color="red"
              sub="Prioridade de cobrança"
            />
            <KpiCard
              label="Clientes inadimplentes"
              value={String(clientesInadimplentes)}
              color={clientesInadimplentes > 0 ? "red" : "green"}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Dias em atraso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueAR.length === 0
                  ? <EmptyRow cols={5} msg="Nenhum título vencido. Tudo em dia!" />
                  : overdueAR.map((r) => (
                    <TableRow key={r.id} className={r.daysOverdue > 30 ? "bg-red-50" : undefined}>
                      <TableCell className="font-medium text-sm">{r.clientName}</TableCell>
                      <TableCell className="text-sm text-gray-600">{r.description}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-red-700">
                        {fmtBRL(r.amount)}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-gray-600">{fmtDate(r.dueDate)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-semibold text-sm ${r.daysOverdue > 30 ? "text-red-700" : "text-orange-600"}`}>
                        {r.daysOverdue}d
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
