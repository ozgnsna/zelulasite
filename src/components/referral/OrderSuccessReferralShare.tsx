"use client";

import { useState } from "react";
import { toast } from "sonner";
import { referralWhatsAppShareBody } from "@/lib/referral/share-copy";
import { trackWhatsAppClick } from "@/lib/analytics";

export function OrderSuccessReferralShare({ shareUrl }: { shareUrl: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link kopyalandı ✨");
    } catch {
      toast.error("Link kopyalanamadı");
    }
  };

  const whatsapp = () => {
    const text = referralWhatsAppShareBody(shareUrl);
    trackWhatsAppClick({ location: "order_success_referral_share", href: "https://wa.me/" });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto mt-8 max-w-md rounded-2xl border border-[#ebe3d6]/90 bg-[linear-gradient(165deg,#fffdfb_0%,#faf6ef_55%,#f7f0e6_100%)] px-4 py-4 text-left shadow-[0_10px_28px_rgba(62,53,42,0.06)] sm:px-5 sm:py-5">
      <h2 className="font-serif text-lg font-light text-stone-900 sm:text-xl">
        Bu alışverişini paylaş, ekstra puan kazan <span aria-hidden>✨</span>
      </h2>
      <p className="mt-2 text-[13px] font-light leading-relaxed text-stone-600">Paylaştığın stil sana kazandırır.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
        <button
          type="button"
          onClick={() => void copy()}
          className="zl-btn inline-flex rounded-full border border-[#d9ccb9] bg-white/90 px-4 py-2 text-xs font-medium text-stone-800 transition hover:border-[#c6a15b]/55 hover:bg-[#faf4ea]"
        >
          {copied ? "Kopyalandı ✨" : "Linki kopyala"}
        </button>
        <button
          type="button"
          onClick={whatsapp}
          className="zl-btn inline-flex rounded-full border border-[#c6a15b]/45 bg-[linear-gradient(135deg,#faf6ef,#fffdfb)] px-4 py-2 text-xs font-medium text-[#4a3f34] shadow-[0_4px_14px_rgba(198,161,91,0.14)] transition hover:border-[#c6a15b]/70"
        >
          WhatsApp&apos;ta paylaş
        </button>
      </div>
    </div>
  );
}
