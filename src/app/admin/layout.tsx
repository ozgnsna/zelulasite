import { headers } from "next/headers";
import type { ReactNode } from "react";
import { AdminConsoleLayout } from "@/components/admin/AdminConsoleLayout";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const path = h.get("x-pathname") ?? "";
  if (path.startsWith("/admin/login")) {
    return <>{children}</>;
  }
  return <AdminConsoleLayout>{children}</AdminConsoleLayout>;
}
