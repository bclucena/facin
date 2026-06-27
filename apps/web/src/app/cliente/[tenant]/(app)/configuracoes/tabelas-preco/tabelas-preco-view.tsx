"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@facin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { criarTabela, atualizarTabela, toggleAtivoTabela, deletarTabela } from "./actions";

export type TabelaRow = {
  id: string;
  nome: string;
  desconto: number;
  ativo: boolean;
};

const schema = z.object({
  nome:     z.string().min(1, "Nome é obrigatório"),
  desconto: z.coerce.number().min(0).max(100).default(0),
  ativo:    z.boolean().default(true),
});
type TabelaForm = z.infer<typeof schema>;

const DEFAULT: TabelaForm = { nome: "", desconto: 0, ativo: true };

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function TabelasPrecoView({ tabelas, tenantSlug }: { tabelas: TabelaRow[]; tenantSlug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TabelaRow | null>(null);

  const form = useForm<TabelaForm>({
    resolver: zodResolver(schema) as Resolver<TabelaForm>,
    defaultValues: DEFAULT,
  });

  function openNew() {
    setEditing(null);
    form.reset(DEFAULT);
    setSheetOpen(true);
  }

  function openEdit(item: TabelaRow) {
    setEditing(item);
    form.reset({ nome: item.nome, desconto: item.desconto, ativo: item.ativo });
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditing(null);
  }

  async function onSubmit(data: TabelaForm) {
    try {
      if (editing) {
        await atualizarTabela(tenantSlug, editing.id, data);
        toast.success("Tabela atualizada");
      } else {
        await criarTabela(tenantSlug, data);
        toast.success("Tabela criada");
      }
      closeSheet();
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    }
  }

  async function handleToggle(id: string, ativo: boolean) {
    try {
      await toggleAtivoTabela(tenantSlug, id, !ativo);
      toast.success("Status atualizado");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao atualizar status.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza? Esta ação não pode ser desfeita.")) return;
    try {
      await deletarTabela(tenantSlug, id);
      toast.success("Tabela removida");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao remover tabela.");
    }
  }

  return (
    <>
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tabelas de Preço</h1>
            <p className="text-sm text-gray-500 mt-0.5">{tabelas.length} tabelas</p>
          </div>
          <Button onClick={openNew} className="gap-2" disabled={isPending}>
            <Plus size={16} /> Nova tabela
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Desconto (%)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabelas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Tag className="h-10 w-10 text-gray-200" />
                      <p className="text-sm text-gray-400">Nenhuma tabela de preço cadastrada.</p>
                      <Button size="sm" variant="outline" onClick={openNew}>
                        Criar primeira tabela
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tabelas.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell className="text-right tabular-nums text-gray-600">
                      {item.desconto > 0 ? `${item.desconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.ativo ? "success" : "secondary"}>
                        {item.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggle(item.id, item.ativo)}
                          disabled={isPending}
                          className="h-8 px-2 text-xs text-gray-500"
                        >
                          {item.ativo ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
                          disabled={isPending}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent className="w-full sm:max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar tabela" : "Nova tabela de preço"}</SheetTitle>
            <SheetDescription>
              {editing ? `Editando ${editing.nome}` : "Defina o nome e o desconto padrão da tabela."}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6">
            <F label="Nome *" error={form.formState.errors.nome?.message}>
              <Input
                placeholder='Ex: "Tabela Varejo", "Atacado 10%"'
                {...form.register("nome")}
              />
            </F>

            <F label="Desconto padrão (%)" error={form.formState.errors.desconto?.message}>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="0"
                {...form.register("desconto")}
              />
            </F>

            <div className="flex items-center gap-3 py-2">
              <Switch
                id="tab-ativo"
                checked={form.watch("ativo")}
                onCheckedChange={(v) => form.setValue("ativo", v)}
              />
              <Label htmlFor="tab-ativo">{form.watch("ativo") ? "Ativa" : "Inativa"}</Label>
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={closeSheet}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editing ? "Salvar alterações" : "Criar tabela"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
