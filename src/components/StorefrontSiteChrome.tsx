import { AdminImpersonationBanner } from "@/components/admin/AdminImpersonationBanner";
import { Header } from "@/components/Header";

/** Duyuru şeridi kaydırınca üstte kalır: müşteri bandı + site header. */
export function StorefrontSiteChrome() {
  return (
    <>
      <AdminImpersonationBanner />
      <Header />
    </>
  );
}
