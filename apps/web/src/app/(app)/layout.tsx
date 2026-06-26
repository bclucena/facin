import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Toaster } from "sonner";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/entrar')

  return (
    <AppShell>
      {children}
      <Toaster position="bottom-right" richColors />
    </AppShell>
  );
}
