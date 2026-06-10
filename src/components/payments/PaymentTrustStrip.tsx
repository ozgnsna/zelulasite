import Image from "next/image";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentTrustStripProps = {
  variant?: "footer" | "checkout";
  className?: string;
};

export function PaymentTrustStrip({ variant = "footer", className }: PaymentTrustStripProps) {
  const compact = variant === "checkout";

  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-200/90 bg-white/80",
        compact ? "p-3.5" : "p-4 sm:p-5",
        className,
      )}
    >
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

      <div className="relative mt-3 h-10 w-full max-w-3xl sm:h-11">
        <Image
          src="/payment-cards-tr.png"
          alt="Axess, Maximum, Bankkart, Bonus, World, QNB, Advantage, Paraf ve Sağlam Kart"
          fill
          className="object-contain object-left"
          sizes="(max-width: 768px) 100vw, 640px"
        />
      </div>

      <p className={cn("mt-3 leading-relaxed text-stone-600", compact ? "text-[11px]" : "text-xs sm:text-sm")}>
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
      </p>

      <p className={cn("mt-1.5 text-stone-500", compact ? "text-[10px]" : "text-[11px] sm:text-xs")}>
        Tüm kartlara taksit imkânı sunulmaktadır; vade farkı banka ve karta göre değişebilir.
      </p>
    </div>
  );
}
