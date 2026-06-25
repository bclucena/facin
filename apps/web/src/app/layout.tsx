import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Facin ERP",
  description: "Sistema de gestão para distribuidoras",
};

// Clerk só é inicializado quando a publishable key estiver configurada.
// Sem ela, o app roda em modo dev sem autenticação.
const clerkEnabled = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_");

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );

  return clerkEnabled ? <ClerkProvider>{content}</ClerkProvider> : content;
}
