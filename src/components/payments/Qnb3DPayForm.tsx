"use client";

import { QnbCardPreview } from "@/components/payments/QnbCardPreview";
import { detectQnbCardBrand, type QnbCardBrand } from "@/components/payments/qnb-card-preview-utils";
import { Lock, ShieldCheck } from "lucide-react";
import { useCallback, useId, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldErrors = {
  pan?: string;
  expiry?: string;
  cvv?: string;
};

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function formatPanDisplay(digits: string): string {
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiryDisplay(digits: string): string {
  const d = digits.slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function parseExpiry(digits: string): { month: number; year: number } | null {
  if (digits.length !== 4) return null;
  const month = Number(digits.slice(0, 2));
  const year = Number(digits.slice(2, 4));
  if (month < 1 || month > 12) return null;
  return { month, year };
}

function isExpiryExpired(digits: string): boolean {
  const parsed = parseExpiry(digits);
  if (!parsed) return false;
  const now = new Date();
  const currentYy = now.getFullYear() % 100;
  const currentMm = now.getMonth() + 1;
  if (parsed.year < currentYy) return true;
  if (parsed.year === currentYy && parsed.month < currentMm) return true;
  return false;
}

function validatePan(digits: string): string | undefined {
  if (digits.length < 12) return "Geçerli bir kart numarası girin (en az 12 hane).";
  if (digits.length > 19) return "Kart numarası çok uzun.";
  return undefined;
}

function validateExpiry(digits: string): string | undefined {
  if (digits.length < 4) return "Son kullanma tarihini MM/YY olarak girin.";
  const parsed = parseExpiry(digits);
  if (!parsed) return "Geçersiz ay; 01–12 arası olmalıdır.";
  if (isExpiryExpired(digits)) return "Kartın son kullanma tarihi geçmiş.";
  return undefined;
}

function validateCvv(digits: string): string | undefined {
  if (digits.length < 3) return "Güvenlik kodu en az 3 haneli olmalıdır.";
  return undefined;
}

function inputClass(hasError: boolean, extra?: string) {
  return cn(
    "mt-1.5 w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-stone-900 shadow-sm outline-none transition",
    "placeholder:text-stone-400",
    hasError
      ? "border-rose-400 ring-2 ring-rose-100 focus:border-rose-500 focus:ring-rose-200/80"
      : "border-[#e7ded2] focus:border-[#c9a06e] focus:ring-2 focus:ring-[#c9a06e]/25",
    extra,
  );
}

function CardBrandBadge({ brand }: { brand: QnbCardBrand }) {
  if (!brand) return null;

  const base =
    "pointer-events-none absolute right-3 top-1/2 flex h-7 min-w-[2.75rem] -translate-y-1/2 items-center justify-center rounded-md border border-stone-200/80 bg-white/95 px-1.5 shadow-sm backdrop-blur-sm";

  if (brand === "visa") {
    return (
      <span className={base} aria-hidden>
        <span className="text-[11px] font-bold italic tracking-tight text-[#1a1f71]">VISA</span>
      </span>
    );
  }
  if (brand === "mastercard") {
    return (
      <span className={base} aria-hidden>
        <span className="flex items-center -space-x-2">
          <span className="h-4 w-4 rounded-full bg-[#eb001b]" />
          <span className="h-4 w-4 rounded-full bg-[#f79e1b]" />
        </span>
      </span>
    );
  }
  return (
    <span className={base} aria-hidden>
      <span className="text-[10px] font-bold tracking-wide text-[#00a0c6]">TROY</span>
    </span>
  );
}

function FieldShell({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-0">
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs leading-snug text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * QNB 3DPay: kart müşteri sayfasında; gönderim Zelula sunucusuna (`/api/payments/qnb-initiate`).
 * Sunucu bankaya POST eder — tarayıcı doğrudan QNB gateway'e POST etmez.
 */
export function Qnb3DPayForm({
  orderId,
  initiatePath = "/api/payments/qnb-initiate",
  incidentId,
  cardholderName,
}: {
  orderId: string;
  initiatePath?: string;
  incidentId?: string;
  /** Boşsa önizlemede ZELULA gösterilir. */
  cardholderName?: string;
}) {
  const uid = useId();
  const panId = `qnb-pan-${uid}`;
  const expId = `qnb-exp-${uid}`;
  const cvvId = `qnb-cvv-${uid}`;

  const action = initiatePath.startsWith("/") ? initiatePath : `/${initiatePath}`;

  const [panDigits, setPanDigits] = useState("");
  const [expDigits, setExpDigits] = useState("");
  const [cvvDigits, setCvvDigits] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cvvFocused, setCvvFocused] = useState(false);

  const panDisplay = useMemo(() => formatPanDisplay(panDigits), [panDigits]);
  const expDisplay = useMemo(() => formatExpiryDisplay(expDigits), [expDigits]);
  const cardBrand = useMemo(() => detectQnbCardBrand(panDigits), [panDigits]);

  const showPanError = Boolean(errors.pan && (submitted || panDigits.length > 0));
  const showExpError = Boolean(errors.expiry && (submitted || expDigits.length > 0));
  const showCvvError = Boolean(errors.cvv && (submitted || cvvDigits.length > 0));

  const runValidation = useCallback((): FieldErrors => {
    return {
      pan: validatePan(panDigits),
      expiry: validateExpiry(expDigits),
      cvv: validateCvv(cvvDigits),
    };
  }, [panDigits, expDigits, cvvDigits]);

  const validateField = useCallback(
    (field: "pan" | "expiry" | "cvv") => {
      setErrors((prev) => {
        const next = { ...prev };
        if (field === "pan") next.pan = validatePan(panDigits);
        if (field === "expiry") next.expiry = validateExpiry(expDigits);
        if (field === "cvv") next.cvv = validateCvv(cvvDigits);
        return next;
      });
    },
    [panDigits, expDigits, cvvDigits],
  );

  const handlePanChange = (raw: string) => {
    const d = digitsOnly(raw).slice(0, 19);
    setPanDigits(d);
    if (submitted || d.length > 0) validateField("pan");
  };

  const handleExpChange = (raw: string) => {
    const d = digitsOnly(raw).slice(0, 4);
    setExpDigits(d);
    if (submitted || d.length > 0) validateField("expiry");
  };

  const handleCvvChange = (raw: string) => {
    const d = digitsOnly(raw).slice(0, 4);
    setCvvDigits(d);
    if (submitted || d.length > 0) validateField("cvv");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const nextErrors = runValidation();
    setErrors(nextErrors);
    setSubmitted(true);

    if (nextErrors.pan || nextErrors.expiry || nextErrors.cvv) {
      e.preventDefault();
      return;
    }

    setSubmitting(true);
    const form = e.currentTarget;
    const panInput = form.elements.namedItem("Pan");
    const expInput = form.elements.namedItem("Expiry");
    const cvvInput = form.elements.namedItem("Cvv2");
    if (panInput instanceof HTMLInputElement) panInput.value = panDigits;
    if (expInput instanceof HTMLInputElement) expInput.value = expDigits;
    if (cvvInput instanceof HTMLInputElement) cvvInput.value = cvvDigits;
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-12">
      <div className="overflow-hidden rounded-2xl border border-[#e8dfd3]/90 bg-white shadow-[0_8px_40px_-12px_rgba(45,37,33,0.12)]">
        <div className="border-b border-[#efe8de] bg-[linear-gradient(180deg,#fffdfb_0%,#faf6f0_100%)] px-6 py-5 sm:px-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a734f]">Güvenli ödeme</p>
          <h1 className="mt-1 font-serif text-2xl font-light tracking-tight text-stone-900">Kredi kartı</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Bilgileriniz yalnızca bu işlem için şifreli sunucu üzerinden bankaya iletilir; Zelula kart numaranızı
            saklamaz.
          </p>
        </div>

        <form method="POST" action={action} className="space-y-5 px-6 py-6 sm:px-7 sm:py-7" onSubmit={handleSubmit} noValidate>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="Pan" value={panDigits} readOnly aria-hidden tabIndex={-1} />
          <input type="hidden" name="Expiry" value={expDigits} readOnly aria-hidden tabIndex={-1} />
          <input type="hidden" name="Cvv2" value={cvvDigits} readOnly aria-hidden tabIndex={-1} />

          <QnbCardPreview
            panDigits={panDigits}
            expDigits={expDigits}
            cvvLength={cvvDigits.length}
            brand={cardBrand}
            cardholderName={cardholderName}
            flipped={cvvFocused}
            className="pb-1 sm:pb-2"
          />

          <FieldShell id={panId} label="Kart numarası" error={showPanError ? errors.pan : undefined}>
            <div className="relative">
              <input
                id={panId}
                inputMode="numeric"
                autoComplete="cc-number"
                value={panDisplay}
                onChange={(e) => handlePanChange(e.target.value)}
                onBlur={() => validateField("pan")}
                placeholder="0000 0000 0000 0000"
                maxLength={23}
                aria-invalid={showPanError}
                aria-describedby={showPanError ? `${panId}-error` : undefined}
                className={inputClass(Boolean(showPanError), "pr-[4.5rem] font-mono tracking-[0.06em]")}
              />
              <CardBrandBadge brand={cardBrand} />
            </div>
          </FieldShell>

          <div className="grid grid-cols-2 gap-4">
            <FieldShell id={expId} label="Son kullanma" error={showExpError ? errors.expiry : undefined}>
              <input
                id={expId}
                inputMode="numeric"
                autoComplete="cc-exp"
                value={expDisplay}
                onChange={(e) => handleExpChange(e.target.value)}
                onBlur={() => validateField("expiry")}
                placeholder="MM/YY"
                maxLength={5}
                aria-invalid={showExpError}
                aria-describedby={showExpError ? `${expId}-error` : undefined}
                className={inputClass(Boolean(showExpError), "font-mono tracking-wider")}
              />
            </FieldShell>

            <FieldShell id={cvvId} label="CVV" error={showCvvError ? errors.cvv : undefined}>
              <input
                id={cvvId}
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cvvDigits}
                onChange={(e) => handleCvvChange(e.target.value)}
                onFocus={() => setCvvFocused(true)}
                onBlur={() => {
                  setCvvFocused(false);
                  validateField("cvv");
                }}
                placeholder="•••"
                maxLength={4}
                aria-invalid={showCvvError}
                aria-describedby={showCvvError ? `${cvvId}-error` : undefined}
                className={inputClass(Boolean(showCvvError), "font-mono tracking-[0.2em]")}
              />
            </FieldShell>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "w-full rounded-full bg-[linear-gradient(135deg,#2f2a24_0%,#1a1613_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_-6px_rgba(28,24,20,0.45)] transition",
                "hover:shadow-[0_14px_32px_-6px_rgba(28,24,20,0.5)] active:scale-[0.99] disabled:cursor-wait disabled:opacity-80",
              )}
            >
              {submitting ? "Yönlendiriliyor…" : "Güvenli ödeme ekranına devam et"}
            </button>

            <ul className="mt-4 flex flex-col items-center gap-2 text-center">
              <li className="flex items-center gap-1.5 text-[11px] text-stone-500">
                <Lock className="h-3.5 w-3.5 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
                <span>256-bit SSL Güvenli Ödeme</span>
              </li>
              <li className="flex items-center gap-1.5 text-[11px] text-stone-500">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
                <span>QNB Finansbank Altyapısı ile Korunmaktadır</span>
              </li>
            </ul>
          </div>
        </form>
      </div>

      {incidentId ? (
        <p className="mt-4 text-center font-mono text-[10px] text-stone-400">Ref: {incidentId}</p>
      ) : null}
    </div>
  );
}
