"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SavedAddress } from "@/lib/types";
import {
  createSavedAddress,
  deleteSavedAddress,
  setDefaultSavedAddress,
  type AddressActionState,
} from "@/app/actions/addresses";
import { TURKIYE_CITIES, CITY_DISTRICTS } from "@/lib/turkiye-addresses";

function districtsFor(city: string) {
  if (!city) return [];
  return CITY_DISTRICTS[city] ?? ["Merkez"];
}

const fieldClass =
  "w-full rounded-xl border border-[#e8dfd3]/90 bg-[linear-gradient(180deg,#ffffff_0%,#faf8f5_100%)] px-4 py-2.5 text-stone-900 outline-none transition focus:border-[#C6A15B] focus:bg-white focus:shadow-[0_0_0_2px_rgba(198,161,91,0.18)]";

export function SavedAddressesManager({ initialAddresses }: { initialAddresses: SavedAddress[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<AddressActionState | undefined, FormData>(
    createSavedAddress,
    undefined,
  );
  const [, startDel] = useTransition();
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <section id="adreslerim" className="scroll-mt-28">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">Teslimat</p>
      <h2 className="mt-2 font-serif text-xl text-stone-900 sm:text-2xl">Kayıtlı adreslerim</h2>
      <p className="mt-2 text-sm text-stone-600">
        Ödeme sırasında bu adreslerden birini seçebilir veya yeni adres kaydedebilirsin.
      </p>

      {initialAddresses.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {initialAddresses.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-[#e8e2d9] bg-[#fffdfb] p-4 shadow-[0_8px_22px_rgba(55,48,40,0.04)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {a.label}
                    {a.is_default ? (
                      <span className="ml-2 rounded-full bg-[#f4ead8] px-2 py-0.5 text-[10px] font-medium text-[#7a5f38]">
                        Varsayılan
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 font-medium text-stone-900">{a.recipient_name}</p>
                  <p className="text-sm text-stone-600">{a.phone}</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700">
                    {a.address_line}
                    <br />
                    {a.district}, {a.city} {a.postal_code}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!a.is_default ? (
                    <button
                      type="button"
                      className="rounded-full border border-[#e0d5c8] bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-[color:var(--brand-gold)]/40"
                      onClick={() => startDel(() => void setDefaultSavedAddress(a.id))}
                    >
                      Varsayılan yap
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-500 transition hover:bg-stone-50 hover:text-stone-800"
                    onClick={() => startDel(() => void deleteSavedAddress(a.id))}
                  >
                    Sil
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-[#e0d5c8] bg-[#faf8f5] px-4 py-6 text-center text-sm text-stone-600">
          Henüz kayıtlı adres yok. Aşağıdan ekleyebilir veya ödeme adımında &quot;Bu adresi hesabıma kaydet&quot; seçeneğini
          kullanabilirsin.
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-[#e8dfd3] bg-white/80 p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-stone-900">Yeni adres ekle</h3>
        <form action={formAction} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Adres adı (ör. Ev, İş)</label>
            <input name="label" className={fieldClass} placeholder="Ev" maxLength={64} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Alıcı ad soyad</label>
            <input name="recipient_name" required className={fieldClass} placeholder="Ad Soyad" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Telefon</label>
            <input name="phone" required className={fieldClass} placeholder="05xx xxx xx xx" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">İl</label>
              <select
                name="city"
                required
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setDistrict("");
                }}
                className={fieldClass}
              >
                <option value="">İl seçin</option>
                {TURKIYE_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">İlçe</label>
              <select
                name="district"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={!city}
                className={fieldClass}
              >
                <option value="">{city ? "İlçe seçin" : "Önce il seçin"}</option>
                {districtsFor(city).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Posta kodu</label>
            <input name="postal_code" required className={fieldClass} placeholder="34000" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Açık adres</label>
            <textarea name="address_line" required rows={3} className={`${fieldClass} resize-y`} placeholder="Mahalle, sokak, bina no..." />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" name="is_default" className="rounded border-stone-300" />
            Varsayılan adres olarak kaydet
          </label>
          {state && !state.ok ? (
            <p className="text-sm text-red-700" role="alert">
              {state.error}
            </p>
          ) : null}
          {state?.ok ? <p className="text-sm text-emerald-800">Adres kaydedildi.</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-stone-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50"
          >
            {pending ? "Kaydediliyor…" : "Adresi kaydet"}
          </button>
        </form>
      </div>
    </section>
  );
}
