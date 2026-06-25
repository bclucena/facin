# Facin — Contexto do Projeto

Você é **Claudinho**, par de programação do projeto Facin.
Leia este arquivo no início de **toda sessão** para ter contexto completo.

---

## O que é o Facin

**Facin** é um ERP SaaS white-label para distribuidoras brasileiras.
Distribuidoras contratam a plataforma, personalizam com sua marca (logo, cores, domínio)
e seus vendedores/operadores usam o sistema no dia a dia.

Modelo de negócio: **multi-tenant** — cada distribuidora é um tenant isolado.

---

## Tenant Piloto

| Campo | Valor |
|-------|-------|
| Nome | DOM PADEIRO DISTRIBUIDORA LTDA |
| CNPJ | 34.202.587/0001-33 |
| Cor primária | `#0F5132` (verde escuro) |

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 14 App Router + TypeScript |
| Estilo | Tailwind CSS + shadcn/ui |
| Auth | Clerk |
| ORM | Prisma |
| Banco | PostgreSQL |
| Deploy | Vercel (futuro) |

---

## Estrutura do Monorepo

```
facin/
├── apps/
│   ├── web/      → ERP do tenant (app usado pelos clientes da distribuidora)
│   └── master/   → Painel Master (gestão de tenants, planos, onboarding)
├── packages/
│   ├── ui/       → Componentes shadcn/ui compartilhados (@facin/ui)
│   ├── db/       → Prisma schema + client gerado (@facin/db)
│   └── config/   → tsconfig e eslint base compartilhados (@facin/config)
├── CLAUDE.md
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Apps

**`apps/web`** (porta 3000)
- ERP white-label que o tenant personaliza
- Autenticação via Clerk com `organizationId` = `tenantId`
- Rotas protegidas por middleware do Clerk

**`apps/master`** (porta 3001)
- Painel interno da Facin para gestão de tenants
- Clerk com role `master_admin`
- Cria/suspende tenants, configura planos

### Packages

**`@facin/ui`**
- Componentes shadcn/ui reexportados + customizados
- Permite sobrescrever tema por tenant no futuro

**`@facin/db`**
- Schema Prisma único e compartilhado
- Exporta `db` (PrismaClient singleton)
- Multi-tenant: toda tabela core tem `tenantId`

**`@facin/config`**
- `tsconfig/base.json` e `tsconfig/nextjs.json`
- Garante que todos os apps usem o mesmo rigor de TypeScript

---

## Multi-tenancy

Estratégia: **Schema compartilhado com coluna `tenantId`** (Row-Level Isolation).
- Simples de operar inicialmente
- Migrar para schema-per-tenant se escalar para +1000 tenants

`tenantId` é derivado do `organizationId` do Clerk no middleware e injetado
em cada query via `db.$extends(...)` (futuro).

---

## Convenções de Código

- **Server Components por padrão** — use `"use client"` somente quando necessário
- **Sem comentários óbvios** — só comente o "por quê" de coisas não-óbvias
- **Sem abstrações prematuras** — copiar 3x antes de extrair função
- **Validação apenas nas bordas** — input do usuário, API externa
- Nomes de arquivos: `kebab-case` para rotas, `PascalCase` para componentes React
- Variáveis de ambiente: sempre via `.env.local` (nunca commitar segredos)

---

## Variáveis de Ambiente

Veja `.env.example` na raiz para a lista completa.
Nunca commitar `.env` ou `.env.local`.

---

## Comandos Úteis

```bash
pnpm dev          # roda web (:3000) e master (:3001) em paralelo
pnpm build        # build de todos os apps/packages
pnpm lint         # lint em todo o monorepo
pnpm typecheck    # typecheck em todo o monorepo

# Dentro de apps/web ou apps/master:
pnpm dev          # roda só aquele app

# Prisma (dentro de packages/db):
pnpm db:generate  # gera o client
pnpm db:migrate   # aplica migrations em dev
pnpm db:studio    # abre Prisma Studio
pnpm db:push      # sync schema sem migration (prototipagem)
```

---

## Status do Projeto

- [x] Monorepo configurado (Turborepo + pnpm)
- [x] apps/web — Next.js 14 base
- [x] apps/master — Next.js 14 base
- [x] packages/ui — shadcn/ui base
- [x] packages/db — Prisma inicializado
- [x] packages/config — tsconfig compartilhado
- [x] Shell da aplicação — sidebar colapsável + top bar (apps/web)
- [x] Rota /dashboard — 4 cards KPI placeholder
- [x] Clerk integrado (apps/web) — aguardando chaves reais em .env.local
- [x] Rotas placeholder: /vendas, /compras, /estoque, /financeiro, /fiscal, /relatorios
- [x] Módulo Cadastros: /configuracoes (hub) + /clientes, /fornecedores, /produtos, /depositos
- [ ] Clerk configurado com chaves reais
- [x] Schema Prisma multi-tenant completo — Cadastros + Estoque + Financeiro + Compras
- [ ] Módulo: Pedidos de Venda
- [x] Módulo: Estoque — /estoque, /estoque/movimentacao, /estoque/inventario (dados reais Railway)
- [x] Módulo: Financeiro — /contas-a-pagar, /contas-a-receber, /fluxo-de-caixa (dados reais Railway)
- [x] Módulo: Compras — /compras (hub), /compras/cotacoes (useFieldArray, converter em OC), /compras/ordens (receber NF integrado com estoque + AP)
- [ ] Deploy no Vercel
