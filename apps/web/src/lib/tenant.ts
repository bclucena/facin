import { headers } from "next/headers";

export function getTenantId(): string {
  return process.env.DEV_TENANT_ID ?? "dom-padeiro-dev";
}

export function getTenantIdFromSlug(slug?: string): string {
  // Se o slug foi passado explicitamente, usa ele
  if (slug && slug !== "undefined") {
    if (slug === "dom-padeiro") return "dom-padeiro-dev";
    return slug;
  }

  // Senão, tenta pegar do pathname via headers
  try {
    const headersList = headers();
    const pathname = headersList.get("x-pathname") ?? 
                     headersList.get("referer") ?? "";
    const match = pathname.match(/\/cliente\/([^/]+)/);
    if (match) {
      const s = match[1];
      if (s === "dom-padeiro") return "dom-padeiro-dev";
      return s;
    }
  } catch (e) {}

  return process.env.DEV_TENANT_ID ?? "dom-padeiro-dev";
}
