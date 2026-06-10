import Image from "next/image";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentTrustStripProps = {
  variant?: "footer" | "checkout";
  className?: string;
};

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
              "relative mt-3 w-full max-w-3xl",
              compact ? "h-12" : "h-14 sm:h-12 md:h-10",
            )}
          >
            <Image
              src="/payment-cards-tr.png"
              alt="Axess, Maximum, Bankkart, Bonus, World, QNB, Advantage, Paraf ve Sağlam Kart"
              fill
              className="object-contain object-left"
              sizes="(max-width: 768px) 100vw, 480px"
            />
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
