"use client";

import { cn } from "@/lib/utils";
import {
  formatPreviewCvvMask,
  formatPreviewExpiry,
  formatPreviewPanLine,
  type QnbCardBrand,
} from "@/components/payments/qnb-card-preview-utils";

function PreviewBrandMark({ brand }: { brand: QnbCardBrand }) {
  if (brand === "visa") {
    return (
      <span className="text-sm font-bold italic tracking-tight text-white/95" aria-hidden>
        VISA
      </span>
    );
  }
  if (brand === "mastercard") {
    return (
      <span className="flex items-center -space-x-2.5" aria-hidden>
        <span className="h-7 w-7 rounded-full bg-[#eb001b]/95 shadow-sm" />
        <span className="h-7 w-7 rounded-full bg-[#f79e1b]/95 shadow-sm" />
      </span>
    );
  }
  if (brand === "troy") {
    return (
      <span className="text-xs font-bold tracking-[0.12em] text-[#7dd3f0]" aria-hidden>
        TROY
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/35" aria-hidden>
      ••••
    </span>
  );
}

export function QnbCardPreview({
  panDigits,
  expDigits,
  cvvLength,
  brand,
  cardholderName = "ZELULA",
  flipped = false,
  className,
}: {
  panDigits: string;
  expDigits: string;
  /** Yalnızca uzunluk — CVV değeri asla geçirilmez. */
  cvvLength: number;
  brand: QnbCardBrand;
  cardholderName?: string;
  flipped?: boolean;
  className?: string;
}) {
  const panLine = formatPreviewPanLine(panDigits);
  const expiryLine = formatPreviewExpiry(expDigits);
  const cvvMask = formatPreviewCvvMask(cvvLength);
  const holder = (cardholderName.trim() || "ZELULA").toUpperCase().slice(0, 26);

  return (
    <div
      aria-hidden
      className={cn("mx-auto w-full max-w-[340px] select-none", className)}
      style={{ perspective: "1000px" }}
    >
      <div
        className={cn(
          "relative aspect-[1.586/1] w-full transition-transform duration-500 ease-out",
          flipped && "[transform:rotateY(180deg)]",
        )}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_50px_-16px_rgba(20,16,12,0.55)]"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="relative flex h-full flex-col justify-between bg-[linear-gradient(135deg,#3a332c_0%,#1f1b17_48%,#14110f_100%)] p-5 sm:p-6">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#c9a06e]/12 blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <div
                className="h-9 w-11 rounded-md bg-[linear-gradient(145deg,#d4b896_0%,#a8865c_100%)] opacity-90 shadow-inner"
                aria-hidden
              />
              <span className="font-serif text-[11px] font-light tracking-[0.28em] text-[#c9a06e]/80">ZELULA</span>
            </div>

            <p className="relative mt-6 font-mono text-[15px] leading-none tracking-[0.12em] text-white/95 sm:text-base">
              {panLine}
            </p>

            <div className="relative mt-auto flex items-end justify-between gap-3 pt-4">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/40">Son kullanma</p>
                <p className="mt-0.5 font-mono text-sm tracking-wider text-white/90">{expiryLine}</p>
              </div>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/40">Kart sahibi</p>
                <p className="mt-0.5 truncate font-mono text-xs tracking-wide text-white/85">{holder}</p>
              </div>
              <PreviewBrandMark brand={brand} />
            </div>
          </div>
        </div>

        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_50px_-16px_rgba(20,16,12,0.55)]"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="relative flex h-full flex-col bg-[linear-gradient(135deg,#2a2520_0%,#12100e_100%)]">
            <div className="mt-6 h-10 w-full bg-stone-950/85" aria-hidden />
            <div className="flex flex-1 flex-col justify-end px-5 pb-5 sm:px-6 sm:pb-6">
              <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/40">Güvenlik kodu</p>
              <div className="mt-2 flex items-center justify-end">
                <span className="rounded-md bg-[#faf6f0] px-4 py-2 font-mono text-sm tracking-[0.35em] text-stone-800">
                  {cvvMask}
                </span>
              </div>
              <p className="mt-4 text-right text-[9px] text-white/30">Bu önizleme yalnızca görseldir.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
