import { AdminImpersonationBanner } from "@/components/admin/AdminImpersonationBanner";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Header } from "@/components/Header";

/** Duyuru + müşteri bandı + header — her zaman ekranın üstünde sabit kalır. */
export function StorefrontSiteChrome() {
  return (
    <div className="border-b border-[#e8e2d9]/70 bg-[#fffdfb] shadow-[0_1px_0_rgba(255,255,255,0.65)]">
      <AnnouncementBar />
      <AdminImpersonationBanner />
      <Header />
    </div>
  );
}
