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
  { name: "Advantage", src: "/payment-logos/advantage.png", width: 36, height: 30 },
  { name: "Paraf", src: "/payment-logos/paraf.png", width: 56, height: 20 },
  { name: "Sağlam Kart", src: "/payment-logos/saglam.svg", width: 72, height: 20 },
];

function CardLogoBadge({
  card,
  compact,
  dense,
}: {
  card: CardProgram;
  compact: boolean;
  dense?: boolean;
}) {
  return (
    <span
      title={card.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border border-neutral-200/90 bg-white",
        dense
          ? "h-7 px-1 sm:h-[1.875rem] sm:px-1.5"
          : cn(
              "h-9 px-2 sm:h-10 sm:px-2.5",
              compact && "h-10 px-2.5 sm:h-11 sm:px-3",
            ),
      )}
    >
      <Image
        src={card.src}
        alt={card.name}
        width={card.width}
        height={card.height}
        className={cn(
          "h-auto w-auto max-w-[3.25rem] object-contain sm:max-w-[3.5rem]",
          dense
            ? "max-h-3 sm:max-h-3.5"
            : cn("max-h-5 sm:max-h-6", compact && "max-h-6 sm:max-h-7"),
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

  if (compact) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-neutral-200/90 bg-white/80 p-3.5",
          className,
        )}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              Güvenli ödeme
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
              <Lock className="h-3 w-3" aria-hidden />
              256 bit SSL
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {CARD_PROGRAMS.map((card) => (
              <CardLogoBadge key={card.name} card={card} compact />
            ))}
          </div>

          <div>
            <p className="text-[11px] leading-relaxed text-stone-600">{paytrText}</p>
            <p className="mt-1 text-[10px] text-stone-500">{installmentText}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-200/90 bg-white/80 p-3 sm:p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:gap-3">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <p className="shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            Güvenli ödeme
          </p>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-1.5 py-0.5 text-[9px] font-medium text-green-700 sm:px-2 sm:text-[10px]">
            <Lock className="h-3 w-3 shrink-0" aria-hidden />
            256 bit SSL
          </span>
        </div>

        <div className="flex min-w-0 flex-nowrap items-center gap-0.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:shrink-0 sm:gap-1 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {CARD_PROGRAMS.map((card) => (
            <CardLogoBadge key={card.name} card={card} compact={false} dense />
          ))}
        </div>

        <div className="shrink-0 sm:ml-auto sm:max-w-[9rem] sm:border-l sm:border-neutral-200/80 sm:pl-2.5 lg:max-w-[9.5rem] lg:pl-3">
          <p className="text-[8px] leading-snug text-stone-600 sm:text-right sm:text-[9px]">
            {paytrText}
          </p>
          <p className="mt-0.5 text-[7.5px] leading-snug text-stone-500 sm:text-right sm:text-[8px]">
            {installmentText}
          </p>
        </div>
      </div>
    </div>
  );
}
