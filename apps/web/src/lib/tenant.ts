// Retorna o tenantId corrente.
// Em dev sem Clerk: usa DEV_TENANT_ID do .env.local.
// Quando Clerk estiver configurado: trocar por auth().orgId
export function getTenantId(): string {
  const id = process.env.DEV_TENANT_ID;
  if (!id) throw new Error("DEV_TENANT_ID não configurado em .env.local");
  return id;
}
