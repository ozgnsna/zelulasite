"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { getReferralShareLinkForProductSlug } from "@/app/actions/referral-share-context";
import { referralWhatsAppShareBody } from "@/lib/referral/share-copy";
import { trackWhatsAppClick } from "@/lib/analytics";

export function HomeNewsletter() {
  const [pending, setPending] = useState(false);

  const shareReferral = async () => {
    if (pending) return;
    setPending(true);
    try {
      const ctx = await getReferralShareLinkForProductSlug(null);
      const shareUrl = ctx.shareUrl;
      const text = referralWhatsAppShareBody(shareUrl);

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "Zelula",
          text,
          url: shareUrl,
        });
        return;
      }

      trackWhatsAppClick({ location: "home_newsletter_share", href: "https://wa.me/" });
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Paylaşım başlatılamadı");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="container-premium py-14 sm:py-16">
      <div className="relative overflow-hidden rounded-3xl border border-brand-gold/20 bg-gradient-to-br from-[#f7efe4] via-[#faf7f3] to-brand-rose/35 p-8 text-center shadow-[0_20px_50px_rgba(70,53,38,0.08)] sm:p-12">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gold/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-brand-rose/40 blur-3xl"
          aria-hidden
        />

        <h2 className="relative font-serif text-2xl font-light text-stone-900 sm:text-3xl">
          Paylaş, kazanmaya hemen başla ✨
        </h2>
        <p className="relative mx-auto mt-2 max-w-lg text-sm font-light leading-relaxed text-stone-600">
          Davet linkini paylaş, Zelula Puan kazanmaya devam et
        </p>
        <p className="relative mt-2 text-sm font-medium text-[#8a6a3d]">Her davetten +50 Zelula Puan kazan ✨</p>
        <p className="relative mt-2 text-xs font-light text-stone-500">Bugün birçok kişi Zelula&apos;yı davet etti</p>

        <div className="relative mx-auto mt-8 flex max-w-md justify-center"
        >
          <button
            type="button"
            onClick={() => void shareReferral()}
            disabled={pending}
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full bg-gradient-to-b from-stone-950 to-stone-900 px-8 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(15,12,10,0.35)] transition duration-300 ease-out hover:scale-[1.03] hover:shadow-[0_20px_44px_rgba(201,168,106,0.32)]"
          >
            {pending ? "Hazırlanıyor..." : "Paylaş & kazanmaya başla"}
            <Share2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
