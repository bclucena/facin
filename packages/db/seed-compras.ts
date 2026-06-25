import { PrismaClient, QuoteStatus, OrderStatus, AccountType, MovementType } from "@prisma/client";

const prisma = new PrismaClient();
const tenantId = "dom-padeiro-dev";

async function main() {
  const produtos = await prisma.produto.findMany({ where: { tenantId }, orderBy: { codigo: "asc" } });
  if (produtos.length < 2) throw new Error("Produtos insuficientes. Rode seed-dom-padeiro ou seed-estoque primeiro.");

  const fornecedores = await prisma.fornecedor.findMany({ where: { tenantId }, orderBy: { nome: "asc" } });
  if (fornecedores.length < 2) throw new Error("Fornecedores insuficientes. Rode seed-financeiro primeiro.");

  const depositos = await prisma.deposito.findMany({ where: { tenantId } });
  if (depositos.length === 0) throw new Error("Depósitos não encontrados.");

  const [f1, f2] = fornecedores;
  const [p1, p2, p3] = produtos;
  const deposito = depositos[0];

  // Custos de referência (o schema não armazena precoCompra no Produto)
  const custo1 = 48.5;
  const custo2 = 32.0;
  const custo3 = 15.75;

  // Limpa registros anteriores do seed
  await prisma.purchaseOrder.deleteMany({ where: { tenantId, number: { in: ["OC-2026-001", "OC-2026-002"] } } });
  await prisma.purchaseQuote.deleteMany({ where: { tenantId, number: { in: ["COT-2026-001", "COT-2026-002"] } } });

  console.log(`Usando fornecedores: ${f1.nome} | ${f2.nome}`);
  console.log(`Usando produtos: ${p1.descricao} | ${p2.descricao} | ${p3.descricao}`);
  console.log(`Depósito destino: ${deposito.nome}`);
  console.log("\nCriando cotações...");

  // COT-001 — DRAFT
  const cot1 = await prisma.purchaseQuote.create({
    data: {
      tenantId,
      number: "COT-2026-001",
      supplier: { connect: { id: f1.id } },
      supplierName: f1.nome,
      issueDate: new Date("2026-06-20"),
      expectedDate: new Date("2026-07-05"),
      paymentTerms: "30 dias",
      status: QuoteStatus.DRAFT,
      totalAmount: custo1 * 50 + custo2 * 30,
      items: {
        create: [
          { product: { connect: { id: p1.id } }, quantity: 50, unitCost: custo1, totalCost: custo1 * 50 },
          { product: { connect: { id: p2.id } }, quantity: 30, unitCost: custo2, totalCost: custo2 * 30 },
        ],
      },
    },
  });
  console.log(`  ✓ ${cot1.number} — DRAFT (${f1.nome})`);

  // COT-002 — CONVERTED (dará origem à OC-001)
  const cot2 = await prisma.purchaseQuote.create({
    data: {
      tenantId,
      number: "COT-2026-002",
      supplier: { connect: { id: f2.id } },
      supplierName: f2.nome,
      issueDate: new Date("2026-06-15"),
      expectedDate: new Date("2026-06-30"),
      paymentTerms: "À vista",
      status: QuoteStatus.CONVERTED,
      totalAmount: custo3 * 100,
      items: {
        create: [
          { product: { connect: { id: p3.id } }, quantity: 100, unitCost: custo3, totalCost: custo3 * 100 },
        ],
      },
    },
  });
  console.log(`  ✓ ${cot2.number} — CONVERTED (${f2.nome})`);

  console.log("\nCriando ordens de compra...");

  // OC-001 — PENDING (oriunda da COT-002)
  const oc1 = await prisma.purchaseOrder.create({
    data: {
      tenantId,
      number: "OC-2026-001",
      supplier: { connect: { id: f2.id } },
      supplierName: f2.nome,
      quote: { connect: { id: cot2.id } },
      issueDate: new Date("2026-06-16"),
      expectedDate: new Date("2026-06-30"),
      paymentTerms: "À vista",
      status: OrderStatus.PENDING,
      totalAmount: custo3 * 100,
      items: {
        create: [
          { product: { connect: { id: p3.id } }, quantity: 100, unitCost: custo3, totalCost: custo3 * 100, receivedQty: 0 },
        ],
      },
    },
  });
  console.log(`  ✓ ${oc1.number} — PENDING (${f2.nome})`);

  // OC-002 — RECEIVED com movimentações de estoque e título a pagar
  const oc2Amount = custo1 * 20 + custo2 * 15;
  const oc2 = await prisma.purchaseOrder.create({
    data: {
      tenantId,
      number: "OC-2026-002",
      supplier: { connect: { id: f1.id } },
      supplierName: f1.nome,
      issueDate: new Date("2026-06-10"),
      expectedDate: new Date("2026-06-20"),
      paymentTerms: "28 dias boleto",
      status: OrderStatus.RECEIVED,
      nfNumber: "NF-000345",
      nfDate: new Date("2026-06-18"),
      nfAmount: oc2Amount,
      totalAmount: oc2Amount,
      items: {
        create: [
          { product: { connect: { id: p1.id } }, quantity: 20, unitCost: custo1, totalCost: custo1 * 20, receivedQty: 20 },
          { product: { connect: { id: p2.id } }, quantity: 15, unitCost: custo2, totalCost: custo2 * 15, receivedQty: 15 },
        ],
      },
    },
    include: { items: true },
  });
  console.log(`  ✓ ${oc2.number} — RECEIVED NF ${oc2.nfNumber} (${f1.nome})`);

  // Movimentações de estoque para OC-002
  console.log("\nLançando estoque e título a pagar para OC-002...");
  for (const item of oc2.items) {
    await prisma.stockMovement.create({
      data: {
        tenantId,
        product: { connect: { id: item.productId } },
        warehouse: { connect: { id: deposito.id } },
        accountType: AccountType.ESTOQUE_NF,
        movementType: MovementType.ENTRADA,
        quantity: Number(item.receivedQty),
        notes: `Recebimento ${oc2.nfNumber} — ${oc2.number}`,
      },
    });

    await prisma.stockBalance.upsert({
      where: {
        tenantId_productId_warehouseId_accountType: {
          tenantId,
          productId: item.productId,
          warehouseId: deposito.id,
          accountType: AccountType.ESTOQUE_NF,
        },
      },
      create: {
        tenantId,
        product: { connect: { id: item.productId } },
        warehouse: { connect: { id: deposito.id } },
        accountType: AccountType.ESTOQUE_NF,
        quantity: Number(item.receivedQty),
      },
      update: { quantity: { increment: Number(item.receivedQty) } },
    });
  }

  await prisma.accountsPayable.create({
    data: {
      tenantId,
      supplier: { connect: { id: f1.id } },
      supplierName: f1.nome,
      description: `NF ${oc2.nfNumber} — ${oc2.number}`,
      amount: oc2Amount,
      dueDate: new Date("2026-07-16"),
    },
  });

  console.log("  ✓ Movimentações e título a pagar registrados.");
  console.log("\nSeed Compras concluído com sucesso!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
