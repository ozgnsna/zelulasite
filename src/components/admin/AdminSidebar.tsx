"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Gift,
  Megaphone,
  MessageSquare,
  Menu,
  Package,
  Settings,
  Store,
  Users,
  X,
} from "lucide-react";
const ADMIN_SIGN_OUT = "/auth/signout?next=%2Fadmin%2Flogin";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p === "/admin" },
  { href: "/admin/orders", label: "Siparişler", icon: Package, match: (p: string) => p.startsWith("/admin/orders") },
  { href: "/admin/products", label: "Ürünler", icon: Boxes, match: (p: string) => p.startsWith("/admin/products") },
  { href: "/admin/customers", label: "Müşteriler", icon: Users, match: (p: string) => p.startsWith("/admin/customers") },
  { href: "/admin/reviews", label: "Yorumlar", icon: MessageSquare, match: (p: string) => p.startsWith("/admin/reviews") },
  { href: "/admin/gift-cards", label: "Hediye kartları", icon: Gift, match: (p: string) => p.startsWith("/admin/gift-cards") },
  { href: "/admin/campaigns", label: "Kampanyalar", icon: Megaphone, match: (p: string) => p.startsWith("/admin/campaigns") },
  { href: "/admin/trendyol", label: "Trendyol", icon: Store, match: (p: string) => p.startsWith("/admin/trendyol") },
  { href: "/admin/reports", label: "Raporlar", icon: BarChart3, match: (p: string) => p.startsWith("/admin/reports") },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings, match: (p: string) => p.startsWith("/admin/settings") },
] as const;

export function AdminSidebar() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  const linkClass = (active: boolean) =>
    cn(
      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition duration-200",
      active
        ? "bg-[#c9a06e]/15 text-[#e8d4b0] shadow-[inset_0_0_0_1px_rgba(201,160,110,0.35)]"
        : "text-zinc-300 hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_20px_-8px_rgba(201,160,110,0.45)]",
    );

  return (
    <div className="shrink-0 lg:w-64 lg:shrink-0">
      <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#101011] px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-200 transition hover:bg-white/[0.08] hover:text-white"
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Zelula</span>
      </header>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-[55] bg-black/55 backdrop-blur-[2px] lg:hidden"
          aria-label="Menüyü kapat"
          onClick={() => setOpen(false)}
        />
      ) : null}

        <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex w-[min(17.5rem,88vw)] flex-col border-r border-white/[0.06] bg-[#101011] shadow-2xl shadow-black/40 transition-transform duration-300 lg:static lg:z-0 lg:h-dvh lg:w-64 lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-12 items-center justify-between gap-2 border-b border-white/[0.06] px-3 lg:h-14">
          <Link
            href="/admin"
            className="flex min-w-0 flex-1 items-center gap-2 py-1"
            onClick={() => setOpen(false)}
            aria-label="Kontrol paneli"
          >
            <span className="relative block h-8 w-[7.5rem] shrink-0">
              <Image src="/zelula-logo-header.svg" alt="" fill className="object-contain object-left brightness-0 invert opacity-90" sizes="120px" priority />
            </span>
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.08] hover:text-white lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Kapat"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Operasyon</p>
          {nav.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(active)}
                onClick={() => setOpen(false)}
              >
                <Icon className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <form action={ADMIN_SIGN_OUT} method="post">
            <button
              type="submit"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left text-[13px] font-medium text-zinc-300 transition hover:border-[#c9a06e]/40 hover:bg-[#c9a06e]/10 hover:text-[#f0e6d4]"
            >
              Çıkış yap
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
