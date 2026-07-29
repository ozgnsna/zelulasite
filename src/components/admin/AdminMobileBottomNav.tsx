"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LayoutDashboard, Menu, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p: string) => p === "/admin",
  },
  {
    href: "/admin/orders",
    label: "Siparişler",
    icon: Package,
    match: (p: string) => p.startsWith("/admin/orders"),
  },
  {
    href: "/admin/products",
    label: "Ürünler",
    icon: Boxes,
    match: (p: string) => p.startsWith("/admin/products"),
  },
] as const;

type AdminMobileBottomNavProps = {
  onOpenMenu: () => void;
};

export function AdminMobileBottomNav({ onOpenMenu }: AdminMobileBottomNavProps) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#101011]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="Hızlı admin menü"
    >
      <div className="grid h-14 grid-cols-4">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition",
                active ? "text-[#e8d4b0]" : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-zinc-400 transition hover:text-zinc-200"
          aria-label="Tüm menüyü aç"
        >
          <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          Menü
        </button>
      </div>
    </nav>
  );
}
