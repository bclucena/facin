import { PrismaClient, SalesOrderStatus, AccountType, MovementType, BillStatus } from "@prisma/client";

const prisma = new PrismaClient();
const tenantId = "dom-padeiro-dev";

async function main() {
  const clientes = await prisma.cliente.findMany({ where: { tenantId }, orderBy: { nome: "asc" } });
  if (clientes.length < 2) throw new Error("Clientes insuficientes. Rode seed-financeiro primeiro.");

  const produtos = await prisma.produto.findMany({ where: { tenantId }, orderBy: { codigo: "asc" } });
  if (produtos.length < 2) throw new Error("Produtos insuficientes.");

  const depositos = await prisma.deposito.findMany({ where: { tenantId } });
  if (depositos.length === 0) throw new Error("Depósitos não encontrados.");

  const [c1, c2] = clientes;
  const [p1, p2, p3] = produtos;
  const deposito = depositos[0];

  // Limpa pedidos anteriores do seed
  await prisma.salesOrder.deleteMany({
    where: { tenantId, number: { in: ["VDA-2026-0001", "VDA-2026-0002", "VDA-2026-0003"] } },
  });

  console.log(`Clientes: ${c1.nome} | ${c2.nome}`);
  console.log(`Produtos: ${p1.descricao} | ${p2.descricao} | ${p3.descricao}`);
  console.log(`Depósito: ${deposito.nome}\n`);

  // VDA-0001 — RASCUNHO
  const vda1 = await prisma.salesOrder.create({
    data: {
      tenantId,
      number: "VDA-2026-0001",
      client: { connect: { id: c1.id } },
      clientName: c1.nome,
      issueDate: new Date("2026-06-24"),
      deliveryDate: new Date("2026-07-01"),
      status: SalesOrderStatus.DRAFT,
      subtotal: 50 * 89.9 + 20 * 48.5,
      discountTotal: 50 * 89.9 * 0.05,
      total: 50 * 89.9 * 0.95 + 20 * 48.5,
      notes: "Entrega somente pela manhã.",
      items: {
        create: [
          {
            product: { connect: { id: p1.id } },
            productName: p1.descricao,
            productUnit: p1.unidade,
            quantity: 50,
            unitPrice: 89.9,
            discountPct: 5,
            totalPrice: 50 * 89.9 * 0.95,
          },
          {
            product: { connect: { id: p2.id } },
            productName: p2.descricao,
            productUnit: p2.unidade,
            quantity: 20,
            unitPrice: 48.5,
            discountPct: 0,
            totalPrice: 20 * 48.5,
          },
        ],
      },
    },
  });
  console.log(`✓ ${vda1.number} — RASCUNHO — ${c1.nome} — R$ ${Number(vda1.total).toFixed(2)}`);

  // VDA-0002 — CONFIRMADO
  const vda2 = await prisma.salesOrder.create({
    data: {
      tenantId,
      number: "VDA-2026-0002",
      client: { connect: { id: c2.id } },
      clientName: c2.nome,
      issueDate: new Date("2026-06-22"),
      deliveryDate: new Date("2026-06-28"),
      status: SalesOrderStatus.CONFIRMED,
      subtotal: 100 * 15.75,
      discountTotal: 0,
      total: 100 * 15.75,
      items: {
        create: [
          {
            product: { connect: { id: p3.id } },
            productName: p3.descricao,
            productUnit: p3.unidade,
            quantity: 100,
            unitPrice: 15.75,
            discountPct: 0,
            totalPrice: 100 * 15.75,
          },
        ],
      },
    },
  });
  console.log(`✓ ${vda2.number} — CONFIRMADO — ${c2.nome} — R$ ${Number(vda2.total).toFixed(2)}`);

  // VDA-0003 — FATURADO (com saída de estoque e CR)
  const vda3Total = 30 * 89.9 * 0.9 + 10 * 48.5;
  const vda3 = await prisma.salesOrder.create({
    data: {
      tenantId,
      number: "VDA-2026-0003",
      client: { connect: { id: c1.id } },
      clientName: c1.nome,
      issueDate: new Date("2026-06-18"),
      deliveryDate: new Date("2026-06-23"),
      status: SalesOrderStatus.INVOICED,
      subtotal: 30 * 89.9 + 10 * 48.5,
      discountTotal: 30 * 89.9 * 0.1,
      total: vda3Total,
      items: {
        create: [
          {
            product: { connect: { id: p1.id } },
            productName: p1.descricao,
            productUnit: p1.unidade,
            quantity: 30,
            unitPrice: 89.9,
            discountPct: 10,
            totalPrice: 30 * 89.9 * 0.9,
          },
          {
            product: { connect: { id: p2.id } },
            productName: p2.descricao,
            productUnit: p2.unidade,
            quantity: 10,
            unitPrice: 48.5,
            discountPct: 0,
            totalPrice: 10 * 48.5,
          },
        ],
      },
    },
    include: { items: true },
  });
  console.log(`✓ ${vda3.number} — FATURADO — ${c1.nome} — R$ ${vda3Total.toFixed(2)}`);

  // Saída de estoque para VDA-0003
  for (const item of vda3.items) {
    await prisma.stockMovement.create({
      data: {
        tenantId,
        product: { connect: { id: item.productId } },
        warehouse: { connect: { id: deposito.id } },
        accountType: AccountType.ESTOQUE,
        movementType: MovementType.SAIDA,
        quantity: Number(item.quantity),
        notes: `Faturamento ${vda3.number}`,
      },
    });

    await prisma.stockBalance.upsert({
      where: {
        tenantId_productId_warehouseId_accountType: {
          tenantId,
          productId: item.productId,
          warehouseId: deposito.id,
          accountType: AccountType.ESTOQUE,
        },
      },
      create: {
        tenantId,
        product: { connect: { id: item.productId } },
        warehouse: { connect: { id: deposito.id } },
        accountType: AccountType.ESTOQUE,
        quantity: -Number(item.quantity),
      },
      update: { quantity: { decrement: Number(item.quantity) } },
    });
  }

  // CR para VDA-0003
  await prisma.accountsReceivable.create({
    data: {
      tenantId,
      client: { connect: { id: c1.id } },
      clientName: c1.nome,
      description: `Pedido ${vda3.number}`,
      amount: vda3Total,
      dueDate: new Date("2026-07-23"),
      status: BillStatus.PENDING,
    },
  });

  console.log("  → Estoque debitado e CR criada para VDA-0003.");
  console.log("\nSeed Vendas concluído!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
