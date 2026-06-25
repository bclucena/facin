import { PrismaClient, BillStatus, PaymentType, CashFlowType } from "@prisma/client";

const db = new PrismaClient();
const T = "dom-padeiro-dev";

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function thisMonth(day: number) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), day);
}

async function main() {
  // — Fornecedores (upsert by nome) ————————————————————————————————————
  const forns = [
    { nome: "MOINHO SUPREMO ALIMENTOS LTDA",  cnpj: "00.000.001/0001-00" },
    { nome: "DISTRIBUIDORA ENERGIA S/A",       cnpj: "00.000.002/0001-00" },
    { nome: "TRANSPORTE RÁPIDO LTDA",          cnpj: "00.000.003/0001-00" },
  ];
  const fornMap: Record<string, string> = {};
  for (const f of forns) {
    const ex = await db.fornecedor.findFirst({ where: { tenantId: T, cnpj: f.cnpj } });
    if (ex) { fornMap[f.nome] = ex.id; console.log(`– Fornecedor já existe: ${f.nome}`); }
    else {
      const cr = await db.fornecedor.create({ data: { tenantId: T, ...f, prazoEntrega: 0 } });
      fornMap[f.nome] = cr.id;
      console.log(`✓ Fornecedor criado: ${f.nome}`);
    }
  }

  // — Clientes ——————————————————————————————————————————————————————————
  const clis = [
    { nome: "PADARIA PÃO DE MEL",   documento: "11.111.111/0001-11" },
    { nome: "CONFEITARIA DOCE VIDA", documento: "22.222.222/0001-22" },
    { nome: "MERCADO BOM PREÇO",     documento: "33.333.333/0001-33" },
  ];
  const cliMap: Record<string, string> = {};
  for (const c of clis) {
    const ex = await db.cliente.findFirst({ where: { tenantId: T, documento: c.documento } });
    if (ex) { cliMap[c.nome] = ex.id; console.log(`– Cliente já existe: ${c.nome}`); }
    else {
      const cr = await db.cliente.create({ data: { tenantId: T, ...c } });
      cliMap[c.nome] = cr.id;
      console.log(`✓ Cliente criado: ${c.nome}`);
    }
  }

  // — Contas a Pagar ————————————————————————————————————————————————————
  await db.accountsPayable.deleteMany({ where: { tenantId: T } });
  const payables = [
    // 2 vencidas
    { supplierId: fornMap["MOINHO SUPREMO ALIMENTOS LTDA"], supplierName: "MOINHO SUPREMO ALIMENTOS LTDA",
      description: "Fatura farinha trigo — Lote Jun/26",   amount: 18500.00, dueDate: daysFromNow(-10), status: BillStatus.PENDING },
    { supplierId: fornMap["DISTRIBUIDORA ENERGIA S/A"],    supplierName: "DISTRIBUIDORA ENERGIA S/A",
      description: "Energia elétrica Junho/26",            amount: 3240.50,  dueDate: daysFromNow(-3),  status: BillStatus.PENDING },
    // 2 a vencer
    { supplierId: fornMap["TRANSPORTE RÁPIDO LTDA"],       supplierName: "TRANSPORTE RÁPIDO LTDA",
      description: "Frete entregas semana 26",             amount: 1850.00,  dueDate: daysFromNow(7),   status: BillStatus.PENDING },
    { supplierId: fornMap["MOINHO SUPREMO ALIMENTOS LTDA"], supplierName: "MOINHO SUPREMO ALIMENTOS LTDA",
      description: "Fatura açúcar cristal — Jul/26",      amount: 12000.00, dueDate: daysFromNow(20),  status: BillStatus.PENDING },
    // 1 paga
    { supplierId: fornMap["DISTRIBUIDORA ENERGIA S/A"],    supplierName: "DISTRIBUIDORA ENERGIA S/A",
      description: "Energia elétrica Maio/26",            amount: 3100.00,  dueDate: daysFromNow(-35),
      status: BillStatus.PAID, paidAt: daysFromNow(-33), paidAmount: 3100.00, paymentType: PaymentType.PIX },
  ];
  for (const p of payables) {
    await db.accountsPayable.create({ data: { tenantId: T, ...p } });
  }
  console.log(`\n✓ ${payables.length} contas a pagar criadas.`);

  // — Contas a Receber ——————————————————————————————————————————————————
  await db.accountsReceivable.deleteMany({ where: { tenantId: T } });
  const receivables = [
    // 2 vencidas
    { clientId: cliMap["PADARIA PÃO DE MEL"],   clientName: "PADARIA PÃO DE MEL",
      description: "Venda #1041 — Farinha + Fermento", amount: 5240.00, dueDate: daysFromNow(-8),  status: BillStatus.PENDING },
    { clientId: cliMap["MERCADO BOM PREÇO"],     clientName: "MERCADO BOM PREÇO",
      description: "Venda #1038 — Mix ingredientes",  amount: 2870.00, dueDate: daysFromNow(-2),  status: BillStatus.PENDING },
    // 2 a vencer
    { clientId: cliMap["CONFEITARIA DOCE VIDA"], clientName: "CONFEITARIA DOCE VIDA",
      description: "Venda #1044 — Açúcar + Óleo",    amount: 7600.00, dueDate: daysFromNow(5),   status: BillStatus.PENDING },
    { clientId: cliMap["PADARIA PÃO DE MEL"],   clientName: "PADARIA PÃO DE MEL",
      description: "Venda #1046 — Farinha 50sc",     amount: 9250.00, dueDate: daysFromNow(15),  status: BillStatus.PENDING },
    // 1 recebida
    { clientId: cliMap["MERCADO BOM PREÇO"],     clientName: "MERCADO BOM PREÇO",
      description: "Venda #1036 — Fechamento Maio",  amount: 4300.00, dueDate: daysFromNow(-30),
      status: BillStatus.PAID, receivedAt: daysFromNow(-28), receivedAmount: 4300.00, paymentType: PaymentType.BOLETO },
  ];
  for (const r of receivables) {
    await db.accountsReceivable.create({ data: { tenantId: T, ...r } });
  }
  console.log(`✓ ${receivables.length} contas a receber criadas.`);

  // — Fluxo de Caixa (10 lançamentos no mês atual) ——————————————————————
  await db.cashFlow.deleteMany({ where: { tenantId: T } });
  const cashEntries = [
    { description: "Recebto PADARIA PÃO DE MEL — Venda #1036",  amount: 4300.00, type: CashFlowType.CREDIT, accountCode: "1.1.1", referenceDate: thisMonth(2)  },
    { description: "Pgto DISTRIBUIDORA ENERGIA — Maio/26",       amount: 3100.00, type: CashFlowType.DEBIT,  accountCode: "2.1.1", referenceDate: thisMonth(3)  },
    { description: "Venda à vista — CONFEITARIA DOCE VIDA",      amount: 1820.00, type: CashFlowType.CREDIT, accountCode: "1.1.1", referenceDate: thisMonth(5)  },
    { description: "Frete entregas semana 23",                    amount:  680.00, type: CashFlowType.DEBIT,  accountCode: "2.2.1", referenceDate: thisMonth(6)  },
    { description: "Venda boleto — MERCADO BOM PREÇO #1039",     amount: 3450.00, type: CashFlowType.CREDIT, accountCode: "1.1.2", referenceDate: thisMonth(8)  },
    { description: "Pgto salários Junho/26",                      amount: 8200.00, type: CashFlowType.DEBIT,  accountCode: "2.3.1", referenceDate: thisMonth(10) },
    { description: "Venda pix — PADARIA PÃO DE MEL #1043",      amount: 2780.00, type: CashFlowType.CREDIT, accountCode: "1.1.1", referenceDate: thisMonth(12) },
    { description: "Manutenção empilhadeira",                     amount:  420.00, type: CashFlowType.DEBIT,  accountCode: "2.4.1", referenceDate: thisMonth(14) },
    { description: "Venda à vista — diversos clientes",          amount: 5100.00, type: CashFlowType.CREDIT, accountCode: "1.1.1", referenceDate: thisMonth(16) },
    { description: "Material de escritório e limpeza",            amount:  315.00, type: CashFlowType.DEBIT,  accountCode: "2.4.2", referenceDate: thisMonth(18) },
  ];
  for (const e of cashEntries) {
    await db.cashFlow.create({ data: { tenantId: T, ...e } });
  }
  console.log(`✓ ${cashEntries.length} lançamentos de fluxo de caixa criados.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
