"use client";

import { useState, useTransition } from "react";
import { createCheckout } from "@/app/actions/store";
import type { AnalyticsItem } from "@/lib/analytics";
import { trackBeginCheckout } from "@/lib/analytics";

export function CheckoutForm({
  disabled,
  items,
}: {
  disabled?: boolean;
  items: AnalyticsItem[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successHint, setSuccessHint] = useState<string | null>(null);

  return (
    <form
      id="checkout-form"
      className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSuccessHint(null);
        const fd = new FormData(e.currentTarget);
        trackBeginCheckout(items);
        start(async () => {
          const r = await createCheckout(fd);
          if (r?.ok && r.url) {
            setSuccessHint("Ödeme adımına yönlendiriliyorsunuz...");
            window.location.href = r.url;
          } else {
            setError(r?.error ?? "İşlem başlatılamadı.");
          }
        });
      }}
    >
      <div className="rounded-xl border border-[#eadfce] bg-[#f9f3ea] px-3 py-2.5 text-xs text-stone-700">
        Adım 1/1 • Teslimat bilgileri
      </div>
      <h2 className="text-lg font-medium text-stone-900">Hızlı Ödeme</h2>
      <p className="text-sm leading-relaxed text-stone-600">Tek adımda bilgileri doldurun, ardından güvenli ödeme sayfasına geçin.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="customer_name" autoFocus autoComplete="name" placeholder="Ad Soyad" required className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5" onInvalid={(e)=>e.currentTarget.setCustomValidity("Lütfen ad soyad bilgisini girin.")} onInput={(e)=>e.currentTarget.setCustomValidity("")}/>
        <input name="phone" autoComplete="tel" placeholder="Telefon" required className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5" onInvalid={(e)=>e.currentTarget.setCustomValidity("Lütfen telefon numaranızı girin.")} onInput={(e)=>e.currentTarget.setCustomValidity("")}/>
      </div>
      <div>
        <label htmlFor="checkout-email" className="mb-1 block text-sm font-medium text-stone-700">
          E-posta
        </label>
        <input
          id="checkout-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="siz@ornek.com"
          disabled={disabled || pending}
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-stone-900 outline-none ring-stone-400/30 placeholder:text-stone-400 focus:border-stone-400 focus:ring-2"
          onInvalid={(e)=>e.currentTarget.setCustomValidity("Geçerli bir e-posta adresi girin.")}
          onInput={(e)=>e.currentTarget.setCustomValidity("")}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="city" autoComplete="address-level1" placeholder="İl" required className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5" />
        <input name="district" autoComplete="address-level2" placeholder="İlçe" required className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5" />
        <input name="postal_code" autoComplete="postal-code" placeholder="Posta Kodu" required className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5" />
      </div>
      <input name="address_line" autoComplete="street-address" placeholder="Açık Adres" required className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5" />
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
      {successHint ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{successHint}</p> : null}
      <button
        type="submit"
        disabled={disabled || pending}
        className="w-full rounded-full bg-amber-800 px-6 py-3 text-sm font-medium text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "İşleniyor, lütfen bekleyin..." : "Güvenli ödemeye geç"}
      </button>
      <p className="text-xs text-stone-500">Butona bir kez basmanız yeterli. İşlem sırasında tekrar tıklamanız gerekmez.</p>
    </form>
  );
}
