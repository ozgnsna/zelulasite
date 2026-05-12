import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export function AdminConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#eceae6]">
      <div className="flex min-h-dvh">
        <AdminSidebar />
        <div className="relative flex min-h-dvh min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
