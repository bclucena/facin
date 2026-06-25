"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Pencil, Users } from "lucide-react";
import { Button } from "@facin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { criarCliente, atualizarCliente, toggleAtivoCliente } from "./actions";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ClienteRow = {
  id: string;
  nome: string;
  documento: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  cep: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  limiteCredito: number;
  tabelaPreco: string | null;
  ativo: boolean;
};

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  documento: z.string().min(1, "CPF/CNPJ é obrigatório"),
  telefone: z.string().default(""),
  whatsapp: z.string().default(""),
  email: z.string().default(""),
  cep: z.string().default(""),
  endereco: z.string().default(""),
  bairro: z.string().default(""),
  cidade: z.string().default(""),
  uf: z.string().max(2).default(""),
  limiteCredito: z.coerce.number().min(0).default(0),
  tabelaPreco: z.string().default("TABELA_1"),
  ativo: z.boolean().default(true),
});
type ClienteForm = z.infer<typeof schema>;

const TABELAS = [
  { value: "TABELA_1", label: "Tabela 1 — Varejo" },
  { value: "TABELA_2", label: "Tabela 2 — Atacado" },
  { value: "TABELA_3", label: "Tabela 3 — Especial" },
];

const DEFAULT: ClienteForm = {
  nome: "", documento: "", telefone: "", whatsapp: "", email: "",
  cep: "", endereco: "", bairro: "", cidade: "", uf: "",
  limiteCredito: 0, tabelaPreco: "TABELA_1", ativo: true,
};

function resetFrom(item: ClienteRow): ClienteForm {
  return {
    nome: item.nome,
    documento: item.documento,
    telefone: item.telefone ?? "",
    whatsapp: item.whatsapp ?? "",
    email: item.email ?? "",
    cep: item.cep ?? "",
    endereco: item.endereco ?? "",
    bairro: item.bairro ?? "",
    cidade: item.cidade ?? "",
    uf: item.uf ?? "",
    limiteCredito: item.limiteCredito,
    tabelaPreco: item.tabelaPreco ?? "TABELA_1",
    ativo: item.ativo,
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ClientesView({ clientes }: { clientes: ClienteRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ClienteRow | null>(null);

  const form = useForm<ClienteForm>({ resolver: zodResolver(schema) as Resolver<ClienteForm>, defaultValues: DEFAULT });

  const filtered = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.documento.includes(search)
  );

  function openNew() {
    setEditing(null);
    form.reset(DEFAULT);
    setSheetOpen(true);
  }

  function openEdit(item: ClienteRow) {
    setEditing(item);
    form.reset(resetFrom(item));
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditing(null);
  }

  async function onSubmit(data: ClienteForm) {
    try {
      if (editing) {
        await atualizarCliente(editing.id, data);
        toast.success("Cliente atualizado");
      } else {
        await criarCliente(data);
        toast.success("Cliente cadastrado");
      }
      closeSheet();
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    }
  }

  async function handleToggle(id: string, ativo: boolean) {
    try {
      await toggleAtivoCliente(id, !ativo);
      toast.success("Status atualizado");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao atualizar status.");
    }
  }

  return (
    <>
      <div className="space-y-4 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-500 mt-0.5">{clientes.length} registros</p>
          </div>
          <Button onClick={openNew} className="gap-2" disabled={isPending}>
            <Plus size={16} /> Novo cliente
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Razão Social</TableHead>
                <TableHead>CPF / CNPJ</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Limite</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="h-10 w-10 text-gray-200" />
                      <p className="text-sm text-gray-400">
                        {search ? `Nenhum resultado para "${search}"` : "Nenhum cliente cadastrado ainda."}
                      </p>
                      {!search && (
                        <Button size="sm" variant="outline" onClick={openNew}>
                          Cadastrar primeiro cliente
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-gray-500 font-mono text-xs">{c.documento}</TableCell>
                    <TableCell className="text-gray-500">{c.telefone || "—"}</TableCell>
                    <TableCell className="text-gray-500">
                      {c.cidade ? `${c.cidade}/${c.uf}` : "—"}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {c.limiteCredito > 0
                        ? `R$ ${c.limiteCredito.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {TABELAS.find((t) => t.value === c.tabelaPreco)?.label.split(" — ")[0] ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.ativo ? "success" : "secondary"}>
                        {c.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)} className="h-8 w-8 p-0">
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => handleToggle(c.id, c.ativo)}
                          disabled={isPending}
                          className="h-8 px-2 text-xs text-gray-500"
                        >
                          {c.ativo ? "Desativar" : "Ativar"}
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
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar cliente" : "Novo cliente"}</SheetTitle>
            <SheetDescription>
              {editing ? `Editando ${editing.nome}` : "Preencha os dados do novo cliente."}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6">
            <F label="Nome / Razão Social *" error={form.formState.errors.nome?.message}>
              <Input placeholder="Ex: Padaria Silva Ltda" {...form.register("nome")} />
            </F>
            <F label="CPF / CNPJ *" error={form.formState.errors.documento?.message}>
              <Input placeholder="000.000.000-00 ou 00.000.000/0001-00" {...form.register("documento")} />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Telefone"><Input placeholder="(00) 0000-0000" {...form.register("telefone")} /></F>
              <F label="WhatsApp"><Input placeholder="(00) 00000-0000" {...form.register("whatsapp")} /></F>
            </div>
            <F label="E-mail">
              <Input type="email" placeholder="contato@empresa.com.br" {...form.register("email")} />
            </F>
            <div className="grid grid-cols-3 gap-3">
              <F label="CEP"><Input placeholder="00000-000" {...form.register("cep")} /></F>
              <div className="col-span-2">
                <F label="Endereço"><Input placeholder="Rua, número" {...form.register("endereco")} /></F>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-2">
                <F label="Bairro"><Input placeholder="Bairro" {...form.register("bairro")} /></F>
              </div>
              <div className="col-span-2">
                <F label="Cidade"><Input placeholder="Cidade" {...form.register("cidade")} /></F>
              </div>
              <F label="UF"><Input placeholder="SP" maxLength={2} className="uppercase" {...form.register("uf")} /></F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Limite de crédito (R$)">
                <Input type="number" min={0} step={0.01} placeholder="0,00" {...form.register("limiteCredito")} />
              </F>
              <F label="Tabela de preço">
                <Controller
                  control={form.control}
                  name="tabelaPreco"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TABELAS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </F>
            </div>
            <Controller
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <div className="flex items-center gap-3 py-2">
                  <Switch checked={field.value} onCheckedChange={field.onChange} id="cli-ativo" />
                  <Label htmlFor="cli-ativo">{field.value ? "Ativo" : "Inativo"}</Label>
                </div>
              )}
            />
            <SheetFooter>
              <Button type="button" variant="outline" onClick={closeSheet}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editing ? "Salvar alterações" : "Cadastrar"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
