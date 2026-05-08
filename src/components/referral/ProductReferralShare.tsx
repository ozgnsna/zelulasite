"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { referralWhatsAppShareBody } from "@/lib/referral/share-copy";
import { trackWhatsAppClick } from "@/lib/analytics";

export function ProductReferralShare({ referralCode }: { referralCode: string | null }) {
  const pathname = usePathname();
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const base = window.location.origin;
    if (!referralCode) return `${base}${pathname}`;
    const joiner = pathname.includes("?") ? "&" : "?";
    return `${base}${pathname}${joiner}ref=${encodeURIComponent(referralCode)}`;
  }, [pathname, referralCode]);

  const whatsapp = () => {
    const text = referralWhatsAppShareBody(shareUrl);
    trackWhatsAppClick({ location: "product_referral_share", href: "https://wa.me/" });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mt-4 rounded-xl border border-[#ebe3d7] bg-[#fdfbf8] px-3.5 py-3">
      <p className="text-[12px] font-light text-stone-600">Paylaştığın stil sana kazandırır ✨</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl);
              toast.success("Hazır ✨", { description: "Paylaşım linki kopyalandı." });
            } catch {
              toast.error("Link kopyalanamadı");
            }
          }}
          className="zl-btn rounded-full border border-[#d9ccb9] bg-white px-3.5 py-1.5 text-[11px] font-medium text-stone-800 transition hover:border-[#c6a15b]/55 hover:bg-[#faf4ea]"
        >
          Linki kopyala
        </button>
        <button
          type="button"
          onClick={whatsapp}
          className="zl-btn rounded-full border border-[#c6a15b]/45 bg-[linear-gradient(135deg,#faf6ef,#fffdfb)] px-3.5 py-1.5 text-[11px] font-medium text-[#4a3f34] shadow-[0_4px_12px_rgba(198,161,91,0.12)] transition hover:border-[#c6a15b]/70"
        >
          WhatsApp&apos;ta paylaş
        </button>
      </div>
    </div>
  );
}
