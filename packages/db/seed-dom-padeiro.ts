import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const TENANT_ID = "dom-padeiro-dev";

async function main() {
  const corretos = ["CONFEITARIA", "DEPOSITO 2", "DEPOSITO CENTRAL", "PANIFICACAO"];

  const existentes = await db.deposito.findMany({ where: { tenantId: TENANT_ID } });
  for (const dep of existentes) {
    if (!corretos.includes(dep.nome)) {
      await db.deposito.delete({ where: { id: dep.id } });
      console.log(`✗ Removido: ${dep.nome}`);
    }
  }

  for (const nome of corretos) {
    const existing = await db.deposito.findFirst({ where: { tenantId: TENANT_ID, nome } });
    if (!existing) {
      await db.deposito.create({ data: { tenantId: TENANT_ID, nome, ativo: true } });
      console.log(`✓ Criado: ${nome}`);
    } else {
      console.log(`– Já existe: ${nome}`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
