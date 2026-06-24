import { AdminImpersonationBanner } from "@/components/admin/AdminImpersonationBanner";
import { Header } from "@/components/Header";

/** Duyuru şeridinin altında: müşteri görünümü bandı + site header birlikte yapışkan kalır. */
export function StorefrontSiteChrome() {
  return (
    <div className="sticky top-0 z-40">
      <AdminImpersonationBanner />
      <Header />
    </div>
  );
}
