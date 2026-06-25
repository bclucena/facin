"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Pencil, Package } from "lucide-react";
import { Button } from "@facin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { criarProduto, atualizarProduto, toggleAtivoProduto } from "./actions";

export type ProdutoRow = {
  id: string; codigo: string; codigoBarras: string | null; descricao: string;
  unidade: string; tipo: string | null; grupo: string | null; fabricante: string | null;
  estoqueMinimo: number; ativo: boolean;
};

const TIPOS = [
  { value: "REVENDA", label: "Mercadoria para Revenda" },
  { value: "MATERIA_PRIMA", label: "Matéria-Prima" },
  { value: "EMBALAGEM", label: "Embalagem" },
  { value: "USO_CONSUMO", label: "Uso e Consumo" },
  { value: "ATIVO_IMOBILIZADO", label: "Ativo Imobilizado" },
];
const UNIDADES = ["UN", "CX", "SC", "KG", "LT", "MT", "PC", "RL", "DZ", "BD"];

const schema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  codigoBarras: z.string().default(""),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  unidade: z.string().default("UN"),
  tipo: z.string().default("REVENDA"),
  grupo: z.string().default(""),
  fabricante: z.string().default(""),
  estoqueMinimo: z.coerce.number().min(0).default(0),
  ativo: z.boolean().default(true),
});
type ProdutoForm = z.infer<typeof schema>;

const DEFAULT: ProdutoForm = {
  codigo: "", codigoBarras: "", descricao: "", unidade: "UN",
  tipo: "REVENDA", grupo: "", fabricante: "", estoqueMinimo: 0, ativo: true,
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

export function ProdutosView({ produtos }: { produtos: ProdutoRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ProdutoRow | null>(null);

  const form = useForm<ProdutoForm>({ resolver: zodResolver(schema) as Resolver<ProdutoForm>, defaultValues: DEFAULT });

  const filtered = produtos.filter(
    (p) =>
      p.descricao.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo.toLowerCase().includes(search.toLowerCase()) ||
      (p.codigoBarras ?? "").includes(search)
  );

  function openNew() { setEditing(null); form.reset(DEFAULT); setSheetOpen(true); }
  function openEdit(item: ProdutoRow) {
    setEditing(item);
    form.reset({
      codigo: item.codigo, codigoBarras: item.codigoBarras ?? "",
      descricao: item.descricao, unidade: item.unidade,
      tipo: item.tipo ?? "REVENDA", grupo: item.grupo ?? "",
      fabricante: item.fabricante ?? "", estoqueMinimo: item.estoqueMinimo, ativo: item.ativo,
    });
    setSheetOpen(true);
  }
  function closeSheet() { setSheetOpen(false); setEditing(null); }

  async function onSubmit(data: ProdutoForm) {
    try {
      editing ? await atualizarProduto(editing.id, data) : await criarProduto(data);
      toast.success(editing ? "Produto atualizado" : "Produto cadastrado");
      closeSheet();
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao salvar. Tente novamente."); }
  }

  async function handleToggle(id: string, ativo: boolean) {
    try {
      await toggleAtivoProduto(id, !ativo);
      toast.success("Status atualizado");
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao atualizar status."); }
  }

  return (
    <>
      <div className="space-y-4 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
            <p className="text-sm text-gray-500 mt-0.5">{produtos.length} registros</p>
          </div>
          <Button onClick={openNew} className="gap-2" disabled={isPending}><Plus size={16} /> Novo produto</Button>
        </div>
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Buscar por código ou descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Unid.</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Est. mín.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Package className="h-10 w-10 text-gray-200" />
                      <p className="text-sm text-gray-400">
                        {search ? `Nenhum resultado para "${search}"` : "Nenhum produto cadastrado ainda."}
                      </p>
                      {!search && <Button size="sm" variant="outline" onClick={openNew}>Cadastrar primeiro produto</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-medium">{item.codigo}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate">{item.descricao}</TableCell>
                  <TableCell><span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{item.unidade}</span></TableCell>
                  <TableCell className="text-xs text-gray-500">{TIPOS.find((t) => t.value === item.tipo)?.label ?? item.tipo ?? "—"}</TableCell>
                  <TableCell className="text-gray-500">{item.grupo || "—"}</TableCell>
                  <TableCell className="text-gray-500">{item.estoqueMinimo > 0 ? item.estoqueMinimo : "—"}</TableCell>
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
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar produto" : "Novo produto"}</SheetTitle>
            <SheetDescription>{editing ? `Editando ${editing.descricao}` : "Preencha os dados do novo produto."}</SheetDescription>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6">
            <div className="grid grid-cols-2 gap-3">
              <F label="Código *" error={form.formState.errors.codigo?.message}>
                <Input placeholder="FAR001" className="uppercase" {...form.register("codigo")} />
              </F>
              <F label="Código de barras"><Input placeholder="0000000000000" {...form.register("codigoBarras")} /></F>
            </div>
            <F label="Descrição *" error={form.formState.errors.descricao?.message}>
              <Input placeholder="Ex: FARINHA DE TRIGO ESPECIAL 25KG" className="uppercase" {...form.register("descricao")} />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Unidade">
                <Controller control={form.control} name="unidade" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </F>
              <F label="Tipo">
                <Controller control={form.control} name="tipo" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Grupo"><Input placeholder="Ex: FARINHAS" className="uppercase" {...form.register("grupo")} /></F>
              <F label="Fabricante"><Input placeholder="Ex: Moinho Araçatuba" {...form.register("fabricante")} /></F>
            </div>
            <F label="Estoque mínimo"><Input type="number" min={0} placeholder="0" {...form.register("estoqueMinimo")} /></F>
            <Controller control={form.control} name="ativo" render={({ field }) => (
              <div className="flex items-center gap-3 py-2">
                <Switch checked={field.value} onCheckedChange={field.onChange} id="prod-ativo" />
                <Label htmlFor="prod-ativo">{field.value ? "Ativo" : "Inativo"}</Label>
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
