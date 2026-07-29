"use client";

import { useState, type ReactNode } from "react";
import { AdminMobileBottomNav } from "@/components/admin/AdminMobileBottomNav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export function AdminConsoleLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[#eceae6]">
      <div className="flex min-h-dvh">
        <AdminSidebar open={menuOpen} onOpenChange={setMenuOpen} />
        <div className="relative flex min-h-dvh min-w-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </div>
      </div>
      <AdminMobileBottomNav onOpenMenu={() => setMenuOpen(true)} />
    </div>
  );
}
