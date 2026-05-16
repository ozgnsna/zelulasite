"use client";

import { cn } from "@/lib/utils";
import {
  formatPreviewCvvMask,
  formatPreviewExpiry,
  formatPreviewPanLine,
  type QnbCardBrand,
} from "@/components/payments/qnb-card-preview-utils";

function PreviewBrandMark({ brand }: { brand: NonNullable<QnbCardBrand> }) {
  if (brand === "visa") {
    return (
      <span
        className="block font-serif text-[13px] font-light italic tracking-[0.06em] text-white/75"
        aria-hidden
      >
        visa
      </span>
    );
  }
  if (brand === "mastercard") {
    return (
      <span className="flex items-center -space-x-2" aria-hidden>
        <span className="h-5 w-5 rounded-full border border-white/25 bg-white/10" />
        <span className="h-5 w-5 rounded-full border border-white/20 bg-white/5" />
      </span>
    );
  }
  return (
    <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-white/55" aria-hidden>
      troy
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
      style={{ perspective: "1400px" }}
    >
      <div
        className={cn(
          "relative aspect-[1.586/1] w-full transition-transform duration-[620ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          flipped && "[transform:rotateY(180deg)]",
        )}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_16px_44px_-14px_rgba(20,16,12,0.5)]"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="relative flex h-full flex-col bg-[linear-gradient(148deg,#38312a_0%,#1e1a16_52%,#13100e_100%)] p-5 sm:p-6">
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#c9a06e]/10 blur-2xl"
              aria-hidden
            />

            <span className="pointer-events-none absolute right-3.5 top-3 font-serif text-[8px] font-light tracking-[0.34em] text-[#c9a06e]/65 sm:right-4 sm:top-3.5">
              ZELULA
            </span>

            <div className="relative pt-0.5">
              <div
                className="h-8 w-10 rounded-[5px] bg-[linear-gradient(145deg,#d9c4a8_0%,#a8865c_88%)] opacity-[0.88] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                aria-hidden
              />
            </div>

            <p className="relative mt-7 font-mono text-[14px] leading-snug tracking-[0.035em] text-white/[0.92] tabular-nums sm:mt-8 sm:text-[15px]">
              {panLine}
            </p>

            <div className="relative mt-auto flex items-end gap-6 pt-5 pr-14 sm:pr-16">
              <div>
                <p className="text-[7px] font-medium uppercase tracking-[0.22em] text-white/35">Son kullanma</p>
                <p className="mt-1 font-mono text-[13px] tracking-[0.06em] text-white/88">{expiryLine}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[7px] font-medium uppercase tracking-[0.22em] text-white/35">Kart sahibi</p>
                <p className="mt-1 truncate font-serif text-[13px] font-light tracking-[0.12em] text-white/88">
                  {holder}
                </p>
              </div>
            </div>

            {brand ? (
              <div
                key={brand}
                className="pointer-events-none absolute bottom-5 right-5 animate-in fade-in duration-700 ease-out sm:bottom-6 sm:right-6"
              >
                <PreviewBrandMark brand={brand} />
              </div>
            ) : null}
          </div>
        </div>

        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_16px_44px_-14px_rgba(20,16,12,0.5)]"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="relative flex h-full flex-col bg-[linear-gradient(148deg,#2a2520_0%,#12100e_100%)]">
            <div className="mt-6 h-9 w-full bg-stone-950/80" aria-hidden />
            <div className="flex flex-1 flex-col justify-end px-5 pb-5 sm:px-6 sm:pb-6">
              <p className="text-[7px] font-medium uppercase tracking-[0.22em] text-white/35">Güvenlik kodu</p>
              <div className="mt-2 flex items-center justify-end">
                <span className="rounded-md bg-[#faf6f0]/95 px-3.5 py-1.5 font-mono text-[13px] tracking-[0.28em] text-stone-700/90">
                  {cvvMask}
                </span>
              </div>
              <p className="mt-3.5 text-right text-[8px] text-white/25">Bu önizleme yalnızca görseldir.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
