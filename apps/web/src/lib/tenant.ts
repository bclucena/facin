export function getTenantId(): string {
  return process.env.DEV_TENANT_ID ?? "dom-padeiro-dev";
}

export function getTenantIdFromSlug(slug: string): string {
  // Por enquanto o tenantId é o slug com sufixo -dev
  // Quando Clerk estiver ativo, virá do token de autenticação
  if (slug === "dom-padeiro") return "dom-padeiro-dev";
  return slug;
}
