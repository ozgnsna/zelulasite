"use client";

import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[#e7ded2] bg-white px-3.5 py-3 text-sm text-stone-900 shadow-sm outline-none transition focus:border-[#c9a06e] focus:ring-2 focus:ring-[#c9a06e]/25";

/**
 * QNB 3DPay: kart alanları üye işyeri sayfasında; gönderim bankanın Gateway/Default.aspx adresine POST ile yapılır.
 * `postUrl` / `hiddenFieldsJson`: Next.js sınırında `action` adlı prop ve büyük nesne serileştirmesinden kaçınmak için.
 */
export function Qnb3DPayForm({
  postUrl,
  hiddenFieldsJson,
  flowDebug,
  incidentId,
}: {
  postUrl: string;
  hiddenFieldsJson: string;
  /** Sunucu `QNB_PAY_FLOW_DEBUG=1` veya geliştirme ortamında açılır. */
  flowDebug?: boolean;
  /** Destek korelasyonu (hata ekranında). */
  incidentId?: string;
}) {
  const parsed = useMemo(() => {
    try {
      const raw = JSON.parse(hiddenFieldsJson) as unknown;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return { ok: false as const, fields: null as Record<string, string> | null };
      }
      const fields: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof k !== "string" || !k.trim()) continue;
        fields[k] = v == null ? "" : String(v);
      }
      return { ok: true as const, fields };
    } catch {
      return { ok: false as const, fields: null as Record<string, string> | null };
    }
  }, [hiddenFieldsJson]);

  const postUrlOk = typeof postUrl === "string" && postUrl.trim().length > 0;

  useEffect(() => {
    if (flowDebug) {
      console.info("[payments] Qnb3DPayForm mounted (3DPay kart formu).", {
        postUrl,
        postUrlOk,
        parseOk: parsed.ok,
        fieldCount: parsed.fields ? Object.keys(parsed.fields).length : 0,
      });
    }
  }, [flowDebug, postUrl, postUrlOk, parsed.fields, parsed.ok]);

  if (!postUrlOk || !parsed.ok || !parsed.fields) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-medium text-stone-900">Ödeme formu hazırlanamadı</p>
        <p className="mt-2 text-sm text-stone-600">
          {!postUrlOk
            ? "Banka gönderim adresi eksik veya geçersiz."
            : "İmzalı alanlar okunamadı. Sayfayı yenileyin veya destek ile iletişime geçin."}
        </p>
        {incidentId ? <p className="mt-4 font-mono text-xs text-stone-500">Kod: {incidentId}</p> : null}
      </div>
    );
  }

  const hiddenFields = parsed.fields;

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
      <h1 className="font-serif text-2xl font-light text-stone-900">Kredi kartı ile ödeme</h1>
      <p className="mt-2 text-sm text-stone-600">
        Bilgileriniz yalnızca bankanın güvenli altyapısına iletilir; Zelula kart numaranızı saklamaz.
      </p>
      <form
        method="POST"
        action={postUrl}
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          const f = e.currentTarget;
          const pan = f.elements.namedItem("Pan");
          if (pan instanceof HTMLInputElement) pan.value = pan.value.replace(/\D/g, "").slice(0, 19);
          const exp = f.elements.namedItem("Expiry");
          if (exp instanceof HTMLInputElement) exp.value = exp.value.replace(/\D/g, "").slice(0, 4);
          const cvv = f.elements.namedItem("Cvv2");
          if (cvv instanceof HTMLInputElement) cvv.value = cvv.value.replace(/\D/g, "").slice(0, 4);
        }}
      >
        {Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <div>
          <label htmlFor="qnb-pan" className="block text-xs font-medium uppercase tracking-wide text-stone-500">
            Kart numarası
          </label>
          <input
            id="qnb-pan"
            name="Pan"
            inputMode="numeric"
            autoComplete="cc-number"
            maxLength={19}
            required
            pattern="[0-9]{12,19}"
            className={fieldClass}
            placeholder="0000 0000 0000 0000"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="qnb-exp" className="block text-xs font-medium uppercase tracking-wide text-stone-500">
              Son kullanma (AAYY)
            </label>
            <input
              id="qnb-exp"
              name="Expiry"
              inputMode="numeric"
              autoComplete="cc-exp"
              maxLength={4}
              required
              pattern="[0-9]{4}"
              className={fieldClass}
              placeholder="Örn. 1228"
            />
          </div>
          <div>
            <label htmlFor="qnb-cvv" className="block text-xs font-medium uppercase tracking-wide text-stone-500">
              CVV
            </label>
            <input
              id="qnb-cvv"
              name="Cvv2"
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={4}
              required
              pattern="[0-9]{3,4}"
              className={fieldClass}
              placeholder="•••"
            />
          </div>
        </div>
        <button
          type="submit"
          className={cn(
            "w-full rounded-full bg-[linear-gradient(135deg,#2f2a24,#1f1b17)] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition",
            "hover:shadow-lg active:scale-[0.99]",
          )}
        >
          Bankanın güvenli ödeme ekranına devam et
        </button>
      </form>
    </div>
  );
}
