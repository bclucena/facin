import { Toaster } from "sonner";
import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <Toaster position="bottom-right" richColors />
    </AppShell>
  );
}
