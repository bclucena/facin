"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, AlertTriangle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@facin/ui";

const ACCOUNT_LABELS: Record<string, string> = {
  ESTOQUE_NF: "Estoque NF",
  ESTOQUE: "Estoque",
  ESTOQUE_FISICO: "Estoque Físico",
};

export type StockRow = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  productUnit: string;
  productMinStock: number;
  warehouseId: string;
  warehouseName: string;
  accountType: string;
  quantity: number;
  qtyCommitted: number;
  qtyAvailable: number;
  expiryDate: string | null;
};

type DepositoOption = { id: string; nome: string };

function daysUntil(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export function EstoqueView({ balances, depositos }: { balances: StockRow[]; depositos: DepositoOption[] }) {
  const [search, setSearch] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("ALL");
  const [filterAccount, setFilterAccount] = useState("ALL");

  const filtered = balances.filter((b) => {
    if (filterWarehouse !== "ALL" && b.warehouseId !== filterWarehouse) return false;
    if (filterAccount !== "ALL" && b.accountType !== filterAccount) return false;
    if (search && !b.productName.toLowerCase().includes(search.toLowerCase()) && !b.productCode.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
          <p className="text-sm text-gray-500 mt-0.5">{balances.length} posições</p>
        </div>
        <div className="flex gap-2">
          <Link href="/estoque/movimentacao">
            <Button variant="outline" size="sm">Movimentações</Button>
          </Link>
          <Link href="/estoque/inventario">
            <Button size="sm">Inventário</Button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todos os depósitos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os depósitos</SelectItem>
            {depositos.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Conta de estoque" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as contas</SelectItem>
            <SelectItem value="ESTOQUE_NF">Estoque NF</SelectItem>
            <SelectItem value="ESTOQUE">Estoque</SelectItem>
            <SelectItem value="ESTOQUE_FISICO">Estoque Físico</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><AlertTriangle size={12} className="text-red-500" /> Qtd abaixo do mínimo</span>
        <span className="flex items-center gap-1.5"><Clock size={12} className="text-amber-500" /> Vence em ≤30 dias</span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Depósito</TableHead>
              <TableHead>Conta de Estoque</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">Comprometida</TableHead>
              <TableHead className="text-right">Disponível</TableHead>
              <TableHead>Validade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-sm text-gray-400">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : filtered.map((b) => {
              const lowStock = b.quantity <= b.productMinStock;
              const days = b.expiryDate ? daysUntil(b.expiryDate) : null;
              const nearExpiry = days !== null && days <= 30;
              const expired = days !== null && days < 0;

              return (
                <TableRow key={b.id} className={lowStock || nearExpiry ? "bg-red-50/30" : undefined}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {b.productName}
                      {lowStock && (
                        <AlertTriangle size={13} className="text-red-500 flex-shrink-0" title={`Mínimo: ${b.productMinStock} ${b.productUnit}`} />
                      )}
                      {nearExpiry && !lowStock && (
                        <Clock size={13} className={expired ? "text-red-500" : "text-amber-500"} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{b.productCode}</TableCell>
                  <TableCell className="text-sm">{b.warehouseName}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                      {ACCOUNT_LABELS[b.accountType] ?? b.accountType}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-semibold tabular-nums ${lowStock ? "text-red-600" : "text-gray-900"}`}>
                      {b.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{b.productUnit}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-gray-500">
                    {b.qtyCommitted > 0 ? b.qtyCommitted.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-gray-900">
                    {b.qtyAvailable.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
                  </TableCell>
                  <TableCell>
                    {b.expiryDate ? (
                      <Badge variant={expired ? "destructive" : nearExpiry ? "outline" : "secondary"} className={nearExpiry && !expired ? "border-amber-400 text-amber-700 bg-amber-50" : undefined}>
                        {expired
                          ? `Vencido há ${Math.abs(days!)}d`
                          : days === 0
                          ? "Vence hoje"
                          : `${days}d`}
                      </Badge>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
