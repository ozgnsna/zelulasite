"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { getReferralShareLinkForProductSlug } from "@/app/actions/referral-share-context";
import { ZELULA_ATC_SHARE_EVENT, type AtcShareEventDetail, referralWhatsAppShareBody } from "@/lib/referral/share-copy";
import { trackWhatsAppClick } from "@/lib/analytics";

const SESSION_KEY = "zelula_atc_share_moment_once";

export function AddToCartShareHost() {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  };

  const close = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, []);

  useEffect(() => {
    const onAtc = async (ev: Event) => {
      const ce = ev as CustomEvent<AtcShareEventDetail>;
      const slug = ce.detail?.productSlug ?? null;
      try {
        if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY)) return;
      } catch {
        /* private mode */
      }

      let url = "";
      try {
        const ctx = await getReferralShareLinkForProductSlug(slug);
        url = ctx.shareUrl;
      } catch {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const path = slug && slug.length > 0 ? `/urunler/${slug}` : "/urunler";
        url = `${origin}${path}`;
      }

      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }

      setShareUrl(url);
      setOpen(true);
      clearTimer();
      dismissTimer.current = setTimeout(() => {
        setOpen(false);
      }, 6200);
    };

    window.addEventListener(ZELULA_ATC_SHARE_EVENT, onAtc as EventListener);
    return () => {
      window.removeEventListener(ZELULA_ATC_SHARE_EVENT, onAtc as EventListener);
      clearTimer();
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link kopyalandı ✨");
    } catch {
      toast.error("Link kopyalanamadı");
    }
  };

  const whatsapp = () => {
    const text = referralWhatsAppShareBody(shareUrl);
    trackWhatsAppClick({ location: "atc_share_moment", href: "https://wa.me/" });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  if (!open) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[4.5rem] z-[60] flex justify-center px-3 sm:bottom-8 sm:justify-end sm:pr-6"
      role="status"
    >
      <div className="pointer-events-auto relative max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-2xl border border-[#e8dfd2]/95 bg-[#fffdfb]/96 px-4 py-3.5 shadow-[0_12px_36px_rgba(55,48,40,0.12)] backdrop-blur-md sm:max-w-xs">
        <button
          type="button"
          onClick={close}
          className="absolute right-2 top-2 rounded-full p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          aria-label="Kapat"
        >
          <X className="size-3.5" strokeWidth={1.5} />
        </button>
        <p className="pr-7 text-[13px] font-light leading-snug text-stone-700">
          Bunu arkadaşınla paylaş, birlikte kazanın <span aria-hidden>✨</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            className="zl-btn rounded-full border border-[#d9ccb9] bg-white/90 px-3.5 py-1.5 text-[11px] font-medium text-stone-800 transition hover:border-[#c6a15b]/55 hover:bg-[#faf4ea]"
          >
            Linki kopyala
          </button>
          <button
            type="button"
            onClick={whatsapp}
            className="zl-btn rounded-full border border-[#c6a15b]/45 bg-[linear-gradient(135deg,#faf6ef,#fffdfb)] px-3.5 py-1.5 text-[11px] font-medium text-[#4a3f34] shadow-[0_4px_12px_rgba(198,161,91,0.15)] transition hover:border-[#c6a15b]/70"
          >
            WhatsApp&apos;ta paylaş
          </button>
        </div>
      </div>
    </div>
  );
}
