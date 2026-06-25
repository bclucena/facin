export function getTenantId(): string {
  return process.env.DEV_TENANT_ID ?? "dom-padeiro-dev";
}
