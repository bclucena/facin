"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { criarAlerta, excluirAlerta } from "./actions";

type AlertConfig = {
  id: string;
  diasAntes: number;
  tipo: string;
  ativo: boolean;
};

const TIPO_LABELS: Record<string, string> = {
  PAGAR: "A Pagar",
  RECEBER: "A Receber",
  AMBOS: "Ambos",
};

export function AlertasView({
  alertas,
  tenantSlug,
}: {
  alertas: AlertConfig[];
  tenantSlug: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [diasAntes, setDiasAntes] = useState("3");
  const [tipo, setTipo] = useState<"PAGAR" | "RECEBER" | "AMBOS">("AMBOS");
  const [submitting, setSubmitting] = useState(false);

  async function onAdd() {
    const n = parseInt(diasAntes);
    if (isNaN(n) || n < 1) {
      toast.error("Informe um número de dias válido (mínimo 1).");
      return;
    }
    setSubmitting(true);
    try {
      await criarAlerta(tenantSlug, { diasAntes: n, tipo });
      toast.success("Alerta criado.");
      setDiasAntes("3");
      setTipo("AMBOS");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao criar alerta.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await excluirAlerta(tenantSlug, id);
      toast.success("Alerta removido.");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao remover alerta.");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
          <Bell className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Alertas de Vencimento
          </h2>
          <p className="text-sm text-gray-500">
            Configure quando receber alertas de títulos prestes a vencer.
          </p>
        </div>
      </div>

      {alertas.length === 0 ? (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400">Nenhuma regra configurada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertas.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800">
                  {a.diasAntes} {a.diasAntes === 1 ? "dia" : "dias"} antes
                </span>
                <Badge variant="outline" className="text-xs">
                  {TIPO_LABELS[a.tipo] ?? a.tipo}
                </Badge>
              </div>
              <button
                onClick={() => onDelete(a.id)}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Nova regra</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600">Disparar X dias antes</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={diasAntes}
              onChange={(e) => setDiasAntes(e.target.value)}
              placeholder="Ex: 3"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600">Tipo de título</Label>
            <Select
              value={tipo}
              onValueChange={(v) => setTipo(v as typeof tipo)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AMBOS">Ambos (Pagar e Receber)</SelectItem>
                <SelectItem value="PAGAR">Apenas A Pagar</SelectItem>
                <SelectItem value="RECEBER">Apenas A Receber</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <button
          onClick={onAdd}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Plus size={14} />
          Adicionar regra
        </button>
      </div>
    </div>
  );
}
