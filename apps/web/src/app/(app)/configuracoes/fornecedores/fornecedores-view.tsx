"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Pencil, Truck } from "lucide-react";
import { Button } from "@facin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { criarFornecedor, atualizarFornecedor, toggleAtivoFornecedor } from "./actions";

export type FornecedorRow = {
  id: string; nome: string; cnpj: string; ie: string | null;
  tipoAtividade: string | null; telefone: string | null; whatsapp: string | null;
  email: string | null; cep: string | null; endereco: string | null;
  prazoEntrega: number; ativo: boolean;
};

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cnpj: z.string().min(1, "CNPJ é obrigatório"),
  ie: z.string().default(""),
  tipoAtividade: z.string().default(""),
  telefone: z.string().default(""),
  whatsapp: z.string().default(""),
  email: z.string().default(""),
  cep: z.string().default(""),
  endereco: z.string().default(""),
  prazoEntrega: z.coerce.number().min(0).default(0),
  ativo: z.boolean().default(true),
});
type FornecedorForm = z.infer<typeof schema>;

const TIPOS = [
  { value: "INDUSTRIA", label: "Indústria" },
  { value: "DISTRIBUIDOR", label: "Distribuidor" },
  { value: "IMPORTADOR", label: "Importador" },
  { value: "PRODUTOR_RURAL", label: "Produtor Rural" },
];

const DEFAULT: FornecedorForm = {
  nome: "", cnpj: "", ie: "", tipoAtividade: "", telefone: "",
  whatsapp: "", email: "", cep: "", endereco: "", prazoEntrega: 0, ativo: true,
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

export function FornecedoresView({ fornecedores }: { fornecedores: FornecedorRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<FornecedorRow | null>(null);

  const form = useForm<FornecedorForm>({ resolver: zodResolver(schema), defaultValues: DEFAULT });

  const filtered = fornecedores.filter(
    (f) => f.nome.toLowerCase().includes(search.toLowerCase()) || f.cnpj.includes(search)
  );

  function openNew() { setEditing(null); form.reset(DEFAULT); setSheetOpen(true); }
  function openEdit(item: FornecedorRow) {
    setEditing(item);
    form.reset({
      nome: item.nome, cnpj: item.cnpj, ie: item.ie ?? "", tipoAtividade: item.tipoAtividade ?? "",
      telefone: item.telefone ?? "", whatsapp: item.whatsapp ?? "", email: item.email ?? "",
      cep: item.cep ?? "", endereco: item.endereco ?? "",
      prazoEntrega: item.prazoEntrega, ativo: item.ativo,
    });
    setSheetOpen(true);
  }
  function closeSheet() { setSheetOpen(false); setEditing(null); }

  async function onSubmit(data: FornecedorForm) {
    try {
      editing ? await atualizarFornecedor(editing.id, data) : await criarFornecedor(data);
      toast.success(editing ? "Fornecedor atualizado" : "Fornecedor cadastrado");
      closeSheet();
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao salvar. Tente novamente."); }
  }

  async function handleToggle(id: string, ativo: boolean) {
    try {
      await toggleAtivoFornecedor(id, !ativo);
      toast.success("Status atualizado");
      startTransition(() => router.refresh());
    } catch { toast.error("Erro ao atualizar status."); }
  }

  return (
    <>
      <div className="space-y-4 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
            <p className="text-sm text-gray-500 mt-0.5">{fornecedores.length} registros</p>
          </div>
          <Button onClick={openNew} className="gap-2" disabled={isPending}><Plus size={16} /> Novo fornecedor</Button>
        </div>
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Buscar por nome ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Razão Social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Prazo (dias)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Truck className="h-10 w-10 text-gray-200" />
                      <p className="text-sm text-gray-400">
                        {search ? `Nenhum resultado para "${search}"` : "Nenhum fornecedor cadastrado ainda."}
                      </p>
                      {!search && <Button size="sm" variant="outline" onClick={openNew}>Cadastrar primeiro fornecedor</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell className="text-gray-500 font-mono text-xs">{item.cnpj}</TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {TIPOS.find((t) => t.value === item.tipoAtividade)?.label ?? item.tipoAtividade ?? "—"}
                  </TableCell>
                  <TableCell className="text-gray-500">{item.telefone || "—"}</TableCell>
                  <TableCell className="text-gray-500">{item.prazoEntrega > 0 ? `${item.prazoEntrega}d` : "—"}</TableCell>
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
            <SheetTitle>{editing ? "Editar fornecedor" : "Novo fornecedor"}</SheetTitle>
            <SheetDescription>{editing ? `Editando ${editing.nome}` : "Preencha os dados do novo fornecedor."}</SheetDescription>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6">
            <F label="Nome / Razão Social *" error={form.formState.errors.nome?.message}>
              <Input placeholder="Ex: Fleischmann Ingredientes" {...form.register("nome")} />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="CNPJ *" error={form.formState.errors.cnpj?.message}>
                <Input placeholder="00.000.000/0001-00" {...form.register("cnpj")} />
              </F>
              <F label="Inscrição Estadual"><Input placeholder="000.000.000.000" {...form.register("ie")} /></F>
            </div>
            <F label="Tipo de atividade">
              <Controller control={form.control} name="tipoAtividade" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Telefone"><Input placeholder="(00) 0000-0000" {...form.register("telefone")} /></F>
              <F label="WhatsApp"><Input placeholder="(00) 00000-0000" {...form.register("whatsapp")} /></F>
            </div>
            <F label="E-mail"><Input type="email" placeholder="vendas@fornecedor.com.br" {...form.register("email")} /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="CEP"><Input placeholder="00000-000" {...form.register("cep")} /></F>
              <F label="Prazo de entrega (dias)">
                <Input type="number" min={0} placeholder="0" {...form.register("prazoEntrega")} />
              </F>
            </div>
            <F label="Endereço"><Input placeholder="Rua, número" {...form.register("endereco")} /></F>
            <Controller control={form.control} name="ativo" render={({ field }) => (
              <div className="flex items-center gap-3 py-2">
                <Switch checked={field.value} onCheckedChange={field.onChange} id="forn-ativo" />
                <Label htmlFor="forn-ativo">{field.value ? "Ativo" : "Inativo"}</Label>
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
