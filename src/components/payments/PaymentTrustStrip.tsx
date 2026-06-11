import Image from "next/image";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentTrustStripProps = {
  variant?: "footer" | "checkout";
  className?: string;
};

type CardProgram = {
  name: string;
  src: string;
  width: number;
  height: number;
};

const CARD_PROGRAMS: CardProgram[] = [
  { name: "Axess", src: "/payment-logos/axess.png", width: 88, height: 24 },
  { name: "Maximum", src: "/payment-logos/maximum.svg", width: 88, height: 22 },
  { name: "Bankkart", src: "/payment-logos/bankkart.png", width: 92, height: 22 },
  { name: "Bonus", src: "/payment-logos/bonus.png", width: 92, height: 24 },
  { name: "World", src: "/payment-logos/world.webp", width: 88, height: 24 },
  { name: "QNB", src: "/payment-logos/qnb.png", width: 88, height: 24 },
  { name: "Advantage", src: "/payment-logos/advantage.png", width: 48, height: 40 },
];

const PAIRED_CARD_PROGRAMS: CardProgram[] = [
  { name: "Paraf", src: "/payment-logos/paraf.png", width: 72, height: 28 },
  { name: "Sağlam Kart", src: "/payment-logos/saglam.svg", width: 88, height: 24 },
];

function CardLogoBadge({ card, compact }: { card: CardProgram; compact: boolean }) {
  return (
    <span
      title={card.name}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg border border-neutral-200/90 bg-white px-2 sm:h-10 sm:px-2.5",
        compact && "h-10 px-2.5 sm:h-11 sm:px-3",
      )}
    >
      <Image
        src={card.src}
        alt={card.name}
        width={card.width}
        height={card.height}
        className={cn(
          "h-auto max-h-5 w-auto object-contain sm:max-h-6",
          compact && "max-h-6 sm:max-h-7",
        )}
        unoptimized
      />
    </span>
  );
}

export function PaymentTrustStrip({ variant = "footer", className }: PaymentTrustStripProps) {
  const compact = variant === "checkout";

  const paytrText = (
    <>
      Ödemeler{" "}
      <a
        href="https://www.paytr.com"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[#8b5a2b] underline decoration-[#c6a15b]/60 underline-offset-2 transition hover:text-[#6b4320]"
      >
        PayTR
      </a>{" "}
      altyapısı üzerinden gerçekleştirilir. Kart bilgileriniz PayTR tarafından 256 bit SSL ile korunur.
    </>
  );

  const installmentText = "Tüm kartlara taksit imkânı sunulmaktadır; vade farkı banka ve karta göre değişebilir.";

  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-200/90 bg-white/80",
        compact ? "p-3.5" : "p-3 sm:p-4",
        className,
      )}
    >
      <div
        className={cn(
          compact ? "space-y-3" : "flex flex-col gap-3 md:flex-row md:items-center md:gap-6",
        )}
      >
        <div className={cn(!compact && "min-w-0 md:flex-1")}>
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "font-semibold uppercase tracking-[0.14em] text-stone-500",
                compact ? "text-[10px]" : "text-[11px]",
              )}
            >
              Güvenli ödeme
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
              <Lock className="h-3 w-3" aria-hidden />
              256 bit SSL
            </span>
          </div>

          <div
            className={cn(
              "mt-3 flex flex-wrap gap-1.5 sm:gap-2",
              compact ? "gap-2" : "gap-2 sm:gap-2.5",
            )}
          >
            {CARD_PROGRAMS.map((card) => (
              <CardLogoBadge key={card.name} card={card} compact={compact} />
            ))}
            <span className="inline-flex shrink-0 items-center gap-1.5 sm:gap-2">
              {PAIRED_CARD_PROGRAMS.map((card) => (
                <CardLogoBadge key={card.name} card={card} compact={compact} />
              ))}
            </span>
          </div>
        </div>

        <div className={cn(!compact && "md:max-w-sm md:shrink-0")}>
          <p
            className={cn(
              "leading-relaxed text-stone-600",
              compact ? "text-[11px]" : "text-[11px] sm:text-xs",
            )}
          >
            {paytrText}
          </p>
          <p
            className={cn(
              "mt-1 text-stone-500",
              compact ? "text-[10px]" : "text-[10px] sm:text-[11px]",
            )}
          >
            {installmentText}
          </p>
        </div>
      </div>
    </div>
  );
}
