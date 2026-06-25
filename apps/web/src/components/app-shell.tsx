"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_");
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Banknote,
  FileText,
  BarChart3,
  Settings,
  Menu,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

type NavChild = { href: string; label: string };
type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  children?: NavChild[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  {
    href: "/vendas/pedidos",
    icon: ShoppingCart,
    label: "Vendas",
    children: [
      { href: "/vendas/pedidos", label: "Pedidos" },
      { href: "/configuracoes/clientes", label: "Clientes" },
    ],
  },
  {
    href: "/compras/cotacoes",
    icon: Package,
    label: "Compras",
    children: [
      { href: "/compras/cotacoes", label: "Cotações" },
      { href: "/compras/ordens", label: "Ordens de Compra" },
    ],
  },
  { href: "/estoque", icon: Warehouse, label: "Estoque" },
  {
    href: "/financeiro/contas-a-pagar",
    icon: Banknote,
    label: "Financeiro",
    children: [
      { href: "/financeiro/contas-a-pagar", label: "Contas a Pagar" },
      { href: "/financeiro/contas-a-receber", label: "Contas a Receber" },
      { href: "/financeiro/fluxo-de-caixa", label: "Fluxo de Caixa" },
    ],
  },
  { href: "/fiscal", icon: FileText, label: "Fiscal" },
  { href: "/relatorios", icon: BarChart3, label: "Relatórios" },
  { href: "/configuracoes", icon: Settings, label: "Configurações" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed md:static inset-y-0 left-0 z-30",
          "flex flex-col bg-[#111827] text-white",
          "transition-[width,transform] duration-200 ease-in-out",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 flex-shrink-0">
          <div className="w-8 h-8 rounded-md bg-[#0F5132] flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">F</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold leading-tight truncate">Dom Padeiro</p>
              <p className="text-xs text-white/40 leading-tight">Distribuidora</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map((item) => {
            const { href, icon: Icon, label, children } = item;
            // For parent items with children, derive the base section path
            const basePath = children ? "/" + href.split("/")[1] : href;
            const isActive = children
              ? pathname.startsWith(basePath)
              : pathname === href || pathname.startsWith(href + "/");

            return (
              <div key={href}>
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={[
                    "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg",
                    "text-sm transition-colors duration-150",
                    isActive
                      ? "bg-[#0F5132] text-white"
                      : "text-white/60 hover:text-white hover:bg-white/10",
                  ].join(" ")}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>

                {/* Sub-menu — shown when expanded and parent is active */}
                {children && !collapsed && isActive && (
                  <div className="mt-0.5 mb-1">
                    {children.map((child) => {
                      const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className={[
                            "flex items-center ml-9 mr-2 px-3 py-1.5 rounded-lg",
                            "text-xs transition-colors duration-150",
                            childActive
                              ? "text-white bg-white/15 font-medium"
                              : "text-white/50 hover:text-white/80 hover:bg-white/10",
                          ].join(" ")}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle — desktop only */}
        <div className="hidden md:block p-3 border-t border-white/10 flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expandir" : undefined}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 text-xs transition-colors"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            {!collapsed && <span>Recolher</span>}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 h-16 bg-white border-b border-gray-200 flex-shrink-0">
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-1.5 -ml-1 rounded-md hover:bg-gray-100 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          {/* Tenant name — desktop only */}
          <span className="hidden md:block font-semibold text-sm text-gray-800 select-none">
            Dom Padeiro Distribuidora
          </span>

          {/* Search */}
          <div className="flex-1 max-w-xs relative ml-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 rounded-lg border border-transparent focus:border-gray-300 focus:outline-none focus:bg-white transition-colors"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              className="relative p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Notificações"
            >
              <Bell size={20} />
            </button>
            {clerkEnabled && <UserButton afterSignOutUrl="/entrar" />}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
