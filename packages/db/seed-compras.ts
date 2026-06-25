import { PrismaClient, QuoteStatus, OrderStatus, AccountType, MovementType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("Nenhum tenant encontrado. Rode o seed principal primeiro.");
  const tenantId = tenant.id;

  const produtos = await prisma.produto.findMany({ where: { tenantId }, orderBy: { codigo: "asc" } });
  if (produtos.length < 2) throw new Error("Produtos insuficientes. Rode seed-cadastros primeiro.");

  const fornecedores = await prisma.fornecedor.findMany({ where: { tenantId }, orderBy: { nome: "asc" } });
  if (fornecedores.length < 2) throw new Error("Fornecedores insuficientes. Rode seed-financeiro primeiro.");

  const depositos = await prisma.deposito.findMany({ where: { tenantId } });
  if (depositos.length === 0) throw new Error("Depósitos não encontrados.");

  const [f1, f2] = fornecedores;
  const [p1, p2, p3] = produtos;
  const deposito = depositos[0];

  // Remove cotações e OC anteriores do seed
  await prisma.purchaseOrder.deleteMany({ where: { tenantId, number: { in: ["OC-2026-001", "OC-2026-002"] } } });
  await prisma.purchaseQuote.deleteMany({ where: { tenantId, number: { in: ["COT-2026-001", "COT-2026-002"] } } });

  console.log("Criando cotações...");

  // COT-001 — DRAFT
  const cot1 = await prisma.purchaseQuote.create({
    data: {
      tenantId,
      number: "COT-2026-001",
      supplierId: f1.id,
      supplierName: f1.nome,
      issueDate: new Date("2026-06-20"),
      expectedDate: new Date("2026-07-05"),
      paymentTerms: "30 dias",
      status: QuoteStatus.DRAFT,
      totalAmount: Number(p1.precoCompra) * 50 + Number(p2.precoCompra) * 30,
      items: {
        create: [
          {
            productId: p1.id,
            quantity: 50,
            unitCost: Number(p1.precoCompra),
            totalCost: Number(p1.precoCompra) * 50,
          },
          {
            productId: p2.id,
            quantity: 30,
            unitCost: Number(p2.precoCompra),
            totalCost: Number(p2.precoCompra) * 30,
          },
        ],
      },
    },
  });
  console.log(`  COT DRAFT: ${cot1.number}`);

  // COT-002 — CONVERTED (gerará a OC-001)
  const cot2 = await prisma.purchaseQuote.create({
    data: {
      tenantId,
      number: "COT-2026-002",
      supplierId: f2.id,
      supplierName: f2.nome,
      issueDate: new Date("2026-06-15"),
      expectedDate: new Date("2026-06-30"),
      paymentTerms: "À vista",
      status: QuoteStatus.CONVERTED,
      totalAmount: Number(p3.precoCompra) * 100,
      items: {
        create: [
          {
            productId: p3.id,
            quantity: 100,
            unitCost: Number(p3.precoCompra),
            totalCost: Number(p3.precoCompra) * 100,
          },
        ],
      },
    },
  });
  console.log(`  COT CONVERTED: ${cot2.number}`);

  console.log("Criando ordens de compra...");

  // OC-001 — PENDING (oriunda de COT-002)
  const oc1 = await prisma.purchaseOrder.create({
    data: {
      tenantId,
      number: "OC-2026-001",
      supplierId: f2.id,
      supplierName: f2.nome,
      quoteId: cot2.id,
      issueDate: new Date("2026-06-16"),
      expectedDate: new Date("2026-06-30"),
      paymentTerms: "À vista",
      status: OrderStatus.PENDING,
      totalAmount: Number(p3.precoCompra) * 100,
      items: {
        create: [
          {
            productId: p3.id,
            quantity: 100,
            unitCost: Number(p3.precoCompra),
            totalCost: Number(p3.precoCompra) * 100,
            receivedQty: 0,
          },
        ],
      },
    },
  });
  console.log(`  OC PENDING: ${oc1.number}`);

  // OC-002 — RECEIVED com estoque e título a pagar lançados
  const oc2Amount = Number(p1.precoCompra) * 20 + Number(p2.precoCompra) * 15;
  const oc2 = await prisma.purchaseOrder.create({
    data: {
      tenantId,
      number: "OC-2026-002",
      supplierId: f1.id,
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
          {
            productId: p1.id,
            quantity: 20,
            unitCost: Number(p1.precoCompra),
            totalCost: Number(p1.precoCompra) * 20,
            receivedQty: 20,
          },
          {
            productId: p2.id,
            quantity: 15,
            unitCost: Number(p2.precoCompra),
            totalCost: Number(p2.precoCompra) * 15,
            receivedQty: 15,
          },
        ],
      },
    },
    include: { items: true },
  });
  console.log(`  OC RECEIVED: ${oc2.number}`);

  // Estoque e título para OC-002
  for (const item of oc2.items) {
    await prisma.stockMovement.create({
      data: {
        tenantId,
        productId: item.productId,
        warehouseId: deposito.id,
        accountType: AccountType.ESTOQUE_NF,
        movementType: MovementType.ENTRADA,
        quantity: Number(item.receivedQty),
        notes: `Recebimento NF ${oc2.nfNumber} — ${oc2.number}`,
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
        productId: item.productId,
        warehouseId: deposito.id,
        accountType: AccountType.ESTOQUE_NF,
        quantity: Number(item.receivedQty),
      },
      update: { quantity: { increment: Number(item.receivedQty) } },
    });
  }

  await prisma.accountsPayable.create({
    data: {
      tenantId,
      supplierId: f1.id,
      supplierName: f1.nome,
      description: `NF ${oc2.nfNumber} — ${oc2.number}`,
      amount: oc2Amount,
      dueDate: new Date("2026-07-16"),
    },
  });

  console.log("  Estoque NF e título a pagar lançados para OC-002.");
  console.log("\nSeed Compras concluído.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
