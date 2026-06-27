export const dynamic = 'force-dynamic'

import { Toaster } from "sonner";
import { AppShell } from "@/components/app-shell";
import { db } from "@facin/db";

export default async function AppLayout({ 
  children,
  params 
}: { 
  children: React.ReactNode,
  params: { tenant: string }
}) {
  let tenantName = "Facin ERP";
  let primaryColor = "#0F5132";

  try {
    const tenant = await db.tenant.findUnique({ 
      where: { slug: params.tenant },
      select: { name: true, primaryColor: true }
    });
    if (tenant) {
      tenantName = tenant.name;
      primaryColor = tenant.primaryColor;
    }
  } catch (e) {}

  return (
    <AppShell tenantName={tenantName} primaryColor={primaryColor}>
      {children}
      <Toaster position="bottom-right" richColors />
    </AppShell>
  );
}
