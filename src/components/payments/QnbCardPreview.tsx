"use client";

import { cn } from "@/lib/utils";
import {
  formatPreviewCvvMask,
  formatPreviewExpiry,
  formatPreviewPanLine,
  type QnbCardBrand,
} from "@/components/payments/qnb-card-preview-utils";

const cardLabelClass =
  "text-[6px] font-medium uppercase tracking-[0.28em] text-[#b8a48a]/40";

const cardFaceShellClass =
  "absolute inset-0 overflow-hidden rounded-2xl border border-white/[0.07] shadow-[0_22px_56px_-22px_rgba(16,12,9,0.38),0_6px_16px_-8px_rgba(16,12,9,0.14)]";

function CardFaceLighting() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_85%_70%_at_18%_8%,rgba(255,248,238,0.07)_0%,transparent_52%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.09] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.05]"
        aria-hidden
      />
    </>
  );
}

function PreviewBrandMark({ brand }: { brand: NonNullable<QnbCardBrand> }) {
  if (brand === "visa") {
    return (
      <span
        className="block font-serif text-[13px] font-light italic tracking-[0.06em] text-white/72"
        aria-hidden
      >
        visa
      </span>
    );
  }
  if (brand === "mastercard") {
    return (
      <span className="flex items-center -space-x-2" aria-hidden>
        <span className="h-5 w-5 rounded-full border border-white/22 bg-white/[0.08]" />
        <span className="h-5 w-5 rounded-full border border-white/16 bg-white/[0.04]" />
      </span>
    );
  }
  return (
    <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-white/52" aria-hidden>
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
        <div className={cardFaceShellClass} style={{ backfaceVisibility: "hidden" }}>
          <div className="relative flex h-full flex-col bg-[linear-gradient(152deg,#3c342c_0%,#252019_38%,#1a1612_68%,#12100e_100%)] p-5 sm:p-6">
            <CardFaceLighting />

            <div
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#c9a06e]/[0.07] blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-0 left-0 h-24 w-32 rounded-full bg-[#1a1612]/40 blur-2xl"
              aria-hidden
            />

            <span className="pointer-events-none absolute right-3.5 top-3 font-serif text-[8px] font-light tracking-[0.34em] text-[#c9a06e]/60 sm:right-4 sm:top-3.5">
              ZELULA
            </span>

            <div className="relative pt-0.5">
              <div
                className="h-8 w-10 rounded-[5px] bg-[linear-gradient(148deg,#d4c0a4_0%,#a8865c_92%)] opacity-[0.86] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                aria-hidden
              />
            </div>

            <p className="relative mt-8 font-mono text-[14px] leading-snug tracking-[0.035em] text-white/[0.91] tabular-nums sm:mt-9 sm:text-[15px]">
              {panLine}
            </p>

            <div className="relative mt-auto flex items-end gap-6 pt-6 pr-14 sm:pr-16">
              <div>
                <p className={cardLabelClass}>Son kullanma</p>
                <p className="mt-1.5 font-mono text-[13px] tracking-[0.06em] text-white/86">{expiryLine}</p>
              </div>
              <div className="min-w-0">
                <p className={cardLabelClass}>Kart sahibi</p>
                <p className="mt-1.5 truncate font-serif text-[13px] font-light tracking-[0.12em] text-white/86">
                  {holder}
                </p>
              </div>
            </div>

            {brand ? (
              <div
                key={brand}
                className="pointer-events-none absolute bottom-5 right-5 sm:bottom-6 sm:right-6"
              >
                <div
                  className={cn(
                    "animate-in fade-in duration-[880ms] ease-out",
                    "rounded-md px-1 py-0.5",
                    "shadow-[0_0_18px_rgba(201,160,110,0.05)]",
                    "ring-1 ring-[#c9a06e]/[0.06]",
                  )}
                >
                  <PreviewBrandMark brand={brand} />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={cardFaceShellClass}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="relative flex h-full flex-col bg-[linear-gradient(152deg,#2e2924_0%,#1a1612_55%,#100e0c_100%)]">
            <CardFaceLighting />
            <div className="mt-6 h-9 w-full bg-stone-950/75" aria-hidden />
            <div className="flex flex-1 flex-col justify-end px-5 pb-5 sm:px-6 sm:pb-6">
              <p className={cardLabelClass}>Güvenlik kodu</p>
              <div className="mt-2 flex items-center justify-end">
                <span className="rounded-md bg-[#f5f0e8]/92 px-3.5 py-1.5 font-mono text-[13px] tracking-[0.28em] text-stone-700/88">
                  {cvvMask}
                </span>
              </div>
              <p className="mt-3.5 text-right text-[8px] text-[#b8a48a]/30">Bu önizleme yalnızca görseldir.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
