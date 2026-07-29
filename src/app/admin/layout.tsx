import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { AdminConsoleLayout } from "@/components/admin/AdminConsoleLayout";

export const metadata: Metadata = {
  title: {
    default: "Zelula Admin",
    template: "%s | Zelula Admin",
  },
  appleWebApp: {
    capable: true,
    title: "Zelula Admin",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#101011",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const path = h.get("x-pathname") ?? "";
  if (path.startsWith("/admin/login")) {
    return <>{children}</>;
  }
  return <AdminConsoleLayout>{children}</AdminConsoleLayout>;
}
