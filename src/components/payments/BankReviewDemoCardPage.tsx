"use client";

import { useState, type FormEvent } from "react";
import { formatTry } from "@/lib/money";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[#e7ded2] bg-white px-3.5 py-3 text-sm text-stone-900 shadow-sm outline-none transition focus:border-[#c9a06e] focus:ring-2 focus:ring-[#c9a06e]/25";

/**
 * QNB anahtarları yokken banka incelemesi için yalnızca görsel/demo kart sayfası.
 * Kart verisi kaydedilmez, loglanmaz, API’ye gönderilmez.
 */
export function BankReviewDemoCardPage({
  orderId,
  orderNumber,
  orderTotal,
  currency,
  customerName,
  customerEmail,
  showDebugBadge,
  missingQnbKeys,
}: {
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  showDebugBadge: boolean;
  missingQnbKeys: string[];
}) {
  const [cardholder, setCardholder] = useState(customerName.trim());
  const [pan, setPan] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [demoDone, setDemoDone] = useState(false);

  const onDemoSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDemoDone(true);
    setPan("");
    setExpiry("");
    setCvv("");
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      {showDebugBadge ? (
        <div className="mb-6 rounded-lg border border-amber-500/80 bg-amber-100/90 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-amber-950">
          <p>BANK REVIEW MODE ACTIVE</p>
          <p className="mt-1.5 font-mono normal-case leading-relaxed text-amber-900">
            Missing QNB config keys: {missingQnbKeys.length ? missingQnbKeys.join(", ") : "(none listed)"}
          </p>
        </div>
      ) : null}

      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a5f38]">Zelula ödeme</p>
      <h1 className="mt-2 text-center font-serif text-2xl font-light text-stone-900 sm:text-3xl">Kredi kartı ile ödeme</h1>
      <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-stone-600">
        Kart bilgileriniz saklanmaz. Ödeme işlemi QNB güvenli ödeme altyapısı ile tamamlanacaktır.
      </p>

      <div className="mt-8 rounded-2xl border border-[#e8dccb]/90 bg-white/90 p-5 shadow-[0_12px_32px_rgba(62,52,38,0.06)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Sipariş özeti</p>
        <dl className="mt-3 space-y-2 text-sm text-stone-800">
          <div className="flex justify-between gap-4">
            <dt className="text-stone-600">Sipariş no</dt>
            <dd className="font-mono text-right text-stone-900">{orderNumber || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-stone-600">Müşteri</dt>
            <dd className="text-right text-stone-900">{customerName || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-stone-600">E-posta</dt>
            <dd className="break-all text-right text-stone-900">{customerEmail || "—"}</dd>
          </div>
          <div className="flex justify-between border-t border-[#efe6dc] pt-3 text-base font-semibold text-stone-900">
            <dt>Toplam</dt>
            <dd className="tabular-nums">{formatTry(Number.isFinite(orderTotal) ? orderTotal : 0)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[10px] text-stone-400">Referans id: {orderId}</p>
      </div>

      {demoDone ? (
        <div
          className="mt-8 rounded-2xl border border-[#c9a06e]/50 bg-[#faf6ef] px-5 py-6 text-center shadow-inner"
          role="status"
        >
          <p className="font-serif text-lg text-stone-900">Banka test/onay süreci için demo ödeme ekranıdır.</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">Gerçek işlem başlatılmamıştır.</p>
        </div>
      ) : (
        <form onSubmit={onDemoSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="br-cardholder" className="block text-xs font-medium uppercase tracking-wide text-stone-500">
              Kart üzerindeki isim
            </label>
            <input
              id="br-cardholder"
              value={cardholder}
              onChange={(e) => setCardholder(e.target.value)}
              autoComplete="name"
              className={fieldClass}
              placeholder="Ad Soyad"
            />
          </div>
          <div>
            <label htmlFor="br-pan" className="block text-xs font-medium uppercase tracking-wide text-stone-500">
              Kart numarası
            </label>
            <input
              id="br-pan"
              value={pan}
              onChange={(e) => setPan(e.target.value.replace(/\D/g, "").slice(0, 19))}
              inputMode="numeric"
              autoComplete="off"
              maxLength={19}
              className={fieldClass}
              placeholder="0000 0000 0000 0000"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="br-exp" className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                Son kullanma (AAYY)
              </label>
              <input
                id="br-exp"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                className={fieldClass}
                placeholder="AAYY"
              />
            </div>
            <div>
              <label htmlFor="br-cvv" className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                CVV
              </label>
              <input
                id="br-cvv"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                className={fieldClass}
                placeholder="•••"
              />
            </div>
          </div>
          <p className="text-center text-xs leading-relaxed text-stone-500">
            Kart bilgileriniz saklanmaz. Ödeme işlemi QNB güvenli ödeme altyapısı ile tamamlanacaktır.
          </p>
          <button
            type="submit"
            className={cn(
              "w-full rounded-full bg-[linear-gradient(135deg,#2f2a24,#1f1b17)] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition",
              "hover:shadow-lg active:scale-[0.99]",
            )}
          >
            Güvenli Ödemeye Devam Et
          </button>
        </form>
      )}

      <p className="mt-10 text-center text-[11px] leading-relaxed text-stone-500">
        {currency} · Demo görünüm · Canlı ödeme için QNB üye işyeri bilgileri tanımlandığında bu adım gerçek banka
        ekranına bağlanır.
      </p>
    </div>
  );
}
