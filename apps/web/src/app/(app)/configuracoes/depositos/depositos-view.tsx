"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Pencil, Warehouse } from "lucide-react";
import { Button } from "@facin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { criarDeposito, atualizarDeposito, toggleAtivoDeposito } from "./actions";

export type DepositoRow = { id: string; nome: string; ativo: boolean };

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  ativo: z.boolean().default(true),
});
type DepositoForm = z.infer<typeof schema>;

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function DepositosView({ depositos }: { depositos: DepositoRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<DepositoRow | null>(null);

  const form = useForm<DepositoForm>({ resolver: zodResolver(schema) as Resolver<DepositoForm>, defaultValues: { nome: "", ativo: true } });

  const filtered = depositos.filter((d) => d.nome.toLowerCase().includes(search.toLowerCase()));

  function openNew() { setEditing(null); form.reset({ nome: "", ativo: true }); setSheetOpen(true); }
  function openEdit(item: DepositoRow) { setEditing(item); form.reset({ nome: item.nome, ativo: item.ativo }); setSheetOpen(true); }
  function closeSheet() { setSheetOpen(false); setEditing(null); }

  async function onSubmit(data: DepositoForm) {
    try {
      if (editing) {
        await atualizarDeposito(editing.id, data.nome, data.ativo);
        toast.success("Depósito atualizado");
      } else {
        await criarDeposito(data.nome);
        toast.success("Depósito cadastrado");
      }
      closeSheet();
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao salvar. Tente novamente."); }
  }

  async function handleToggle(id: string, ativo: boolean) {
    try {
      await toggleAtivoDeposito(id, !ativo);
      toast.success("Status atualizado");
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao atualizar status."); }
  }

  return (
    <>
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Depósitos</h1>
            <p className="text-sm text-gray-500 mt-0.5">{depositos.length} registros</p>
          </div>
          <Button onClick={openNew} className="gap-2" disabled={isPending}><Plus size={16} /> Novo depósito</Button>
        </div>
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do depósito</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Warehouse className="h-10 w-10 text-gray-200" />
                      <p className="text-sm text-gray-400">
                        {search ? `Nenhum resultado para "${search}"` : "Nenhum depósito cadastrado ainda."}
                      </p>
                      {!search && <Button size="sm" variant="outline" onClick={openNew}>Cadastrar primeiro depósito</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium tracking-wide">{item.nome}</TableCell>
                  <TableCell><Badge variant={item.ativo ? "success" : "secondary"}>{item.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(item)} className="h-8 w-8 p-0"><Pencil size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggle(item.id, item.ativo)} disabled={isPending} className="h-8 px-2 text-xs text-gray-500">
                        {item.ativo ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent className="w-full sm:max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar depósito" : "Novo depósito"}</SheetTitle>
            <SheetDescription>{editing ? `Editando ${editing.nome}` : "Informe o nome do novo local de armazenamento."}</SheetDescription>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6">
            <F label="Nome *" error={form.formState.errors.nome?.message}>
              <Input
                placeholder="Ex: DEPOSITO NORTE"
                className="uppercase"
                {...form.register("nome")}
                onChange={(e) => form.setValue("nome", e.target.value.toUpperCase())}
              />
            </F>
            <Controller control={form.control} name="ativo" render={({ field }) => (
              <div className="flex items-center gap-3 py-2">
                <Switch checked={field.value} onCheckedChange={field.onChange} id="dep-ativo" />
                <Label htmlFor="dep-ativo">{field.value ? "Ativo" : "Inativo"}</Label>
              </div>
            )} />
            <SheetFooter>
              <Button type="button" variant="outline" onClick={closeSheet}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{editing ? "Salvar alterações" : "Cadastrar"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
