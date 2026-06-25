import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Facin Master",
  description: "Painel de gestão de tenants — Facin",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Adicionar <ClerkProvider> aqui após configurar NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (master)
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
