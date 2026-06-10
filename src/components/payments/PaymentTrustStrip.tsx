import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentTrustStripProps = {
  variant?: "footer" | "checkout";
  className?: string;
};

const CARD_PROGRAMS = [
  { name: "Axess", className: "border-stone-300 text-stone-800" },
  { name: "Maximum", className: "border-fuchsia-200 text-fuchsia-700" },
  { name: "Bankkart", className: "border-red-200 text-red-700" },
  { name: "Bonus", className: "border-emerald-200 text-emerald-700" },
  { name: "World", className: "border-violet-200 text-violet-700" },
  { name: "QNB", className: "border-blue-200 text-blue-800" },
  { name: "Advantage", className: "border-orange-200 text-orange-700" },
  { name: "Paraf", className: "border-sky-200 text-sky-700" },
  { name: "Sağlam Kart", className: "border-lime-200 text-lime-800" },
] as const;

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

          <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
            {CARD_PROGRAMS.map((card) => (
              <span
                key={card.name}
                className={cn(
                  "inline-flex items-center rounded-lg border bg-white px-2.5 py-1 text-[11px] font-semibold tracking-tight sm:px-3 sm:py-1.5 sm:text-xs",
                  card.className,
                )}
              >
                {card.name}
              </span>
            ))}
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
