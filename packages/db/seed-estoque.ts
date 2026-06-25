import { PrismaClient, AccountType, MovementType } from "@prisma/client";

const db = new PrismaClient();
const T = "dom-padeiro-dev";

const PRODUTOS = [
  { codigo: "FAR001", descricao: "FARINHA DE TRIGO ESPECIAL 25KG", unidade: "SC", grupo: "FARINHAS", estoqueMinimo: 50 },
  { codigo: "ACU001", descricao: "AÇÚCAR CRISTAL 50KG",            unidade: "SC", grupo: "AÇÚCARES",  estoqueMinimo: 30 },
  { codigo: "FER001", descricao: "FERMENTO BIOLÓGICO SECO 500G",   unidade: "CX", grupo: "FERMENTOS", estoqueMinimo: 50 },
  { codigo: "OLE001", descricao: "ÓLEO DE SOJA 900ML CX/20",       unidade: "CX", grupo: "ÓLEOS",     estoqueMinimo: 20 },
  { codigo: "SAL001", descricao: "SAL REFINADO 1KG CX/24",         unidade: "CX", grupo: "TEMPEROS",  estoqueMinimo: 40 },
];

async function main() {
  // — Depósitos ——————————————————————————————————————————
  const deps = await db.deposito.findMany({ where: { tenantId: T } });
  const dep = Object.fromEntries(deps.map((d) => [d.nome, d]));
  const needed = ["CONFEITARIA", "DEPOSITO 2", "DEPOSITO CENTRAL", "PANIFICACAO"];
  for (const nome of needed) {
    if (!dep[nome]) throw new Error(`Depósito "${nome}" não encontrado. Execute seed-dom-padeiro primeiro.`);
  }

  // — Produtos ———————————————————————————————————————————
  const prodMap: Record<string, string> = {};
  for (const p of PRODUTOS) {
    const existing = await db.produto.findUnique({ where: { tenantId_codigo: { tenantId: T, codigo: p.codigo } } });
    if (existing) {
      prodMap[p.codigo] = existing.id;
      console.log(`– Produto já existe: ${p.codigo}`);
    } else {
      const created = await db.produto.create({
        data: { tenantId: T, tipo: "REVENDA", fabricante: "", ativo: true, ...p },
      });
      prodMap[p.codigo] = created.id;
      console.log(`✓ Produto criado: ${p.codigo} — ${p.descricao}`);
    }
  }

  // — Saldos + movimentações iniciais ————————————————————
  const vencimentoProximo = new Date();
  vencimentoProximo.setDate(vencimentoProximo.getDate() + 20); // 20 dias → aciona alerta ≤30d

  const balances: Array<{
    productId: string; warehouseId: string; accountType: AccountType;
    quantity: number; expiryDate?: Date;
  }> = [
    // FAR001 — normal em 2 depósitos
    { productId: prodMap.FAR001, warehouseId: dep.CONFEITARIA.id,    accountType: AccountType.ESTOQUE, quantity: 80 },
    { productId: prodMap.FAR001, warehouseId: dep["DEPOSITO CENTRAL"].id, accountType: AccountType.ESTOQUE, quantity: 200 },
    // ACU001 — normal em 2 depósitos
    { productId: prodMap.ACU001, warehouseId: dep.CONFEITARIA.id,    accountType: AccountType.ESTOQUE, quantity: 60 },
    { productId: prodMap.ACU001, warehouseId: dep["DEPOSITO CENTRAL"].id, accountType: AccountType.ESTOQUE, quantity: 120 },
    // FER001 — quantidade ok (110 > mínimo 50), validade próxima → badge âmbar
    { productId: prodMap.FER001, warehouseId: dep.CONFEITARIA.id,    accountType: AccountType.ESTOQUE, quantity: 110, expiryDate: vencimentoProximo },
    // OLE001 — normal em DEPOSITO 2
    { productId: prodMap.OLE001, warehouseId: dep["DEPOSITO 2"].id,  accountType: AccountType.ESTOQUE, quantity: 45 },
    // SAL001 — estoque zerado → badge vermelho (0 ≤ mínimo 40)
    { productId: prodMap.SAL001, warehouseId: dep.PANIFICACAO.id,    accountType: AccountType.ESTOQUE, quantity: 0 },
  ];

  for (const b of balances) {
    await db.stockBalance.upsert({
      where: { tenantId_productId_warehouseId_accountType: { tenantId: T, productId: b.productId, warehouseId: b.warehouseId, accountType: b.accountType } },
      create: { tenantId: T, ...b },
      update: { quantity: b.quantity, expiryDate: b.expiryDate ?? null },
    });

    // Movimentação inicial de entrada
    if (b.quantity > 0) {
      await db.stockMovement.create({
        data: {
          tenantId: T, productId: b.productId, warehouseId: b.warehouseId,
          accountType: b.accountType, movementType: MovementType.ENTRADA,
          quantity: b.quantity, expiryDate: b.expiryDate ?? null,
          notes: "Saldo inicial de implantação",
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
        },
      });
    }
  }

  console.log(`\n✓ ${balances.length} posições de estoque criadas/atualizadas.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
