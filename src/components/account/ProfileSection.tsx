"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "@/app/actions/auth";
import { formatTurkishFullNameLive, normalizeTurkishFullName } from "@/lib/account/turkish-full-name";
import {
  formatTurkishMobileDisplay,
  normalizeTurkishMobileInput,
} from "@/lib/account/turkish-mobile-phone";

const profileFieldClass =
  "w-full max-w-md rounded-xl border border-[#e8dfd3]/90 bg-[linear-gradient(180deg,#ffffff_0%,#faf8f5_100%)] px-4 py-2.5 text-stone-900 outline-none transition-all duration-200 ease-out placeholder:text-stone-400 focus:border-[#C6A15B] focus:bg-white focus:shadow-[0_0_0_2px_rgba(198,161,91,0.18),0_0_18px_rgba(232,201,139,0.22)] focus:ring-0 disabled:opacity-60";

function normalizeBirthInput(raw: string | null | undefined): string {
  if (!raw) return "";
  const t = String(raw).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : "";
}

export function ProfileSection({
  email,
  initialFullName,
  initialPhone,
  initialBirthDate,
}: {
  email: string;
  initialFullName: string;
  initialPhone: string | null;
  initialBirthDate: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, undefined);
  const [fullName, setFullName] = useState(() => normalizeTurkishFullName(initialFullName));
  const initialDigits = normalizeTurkishMobileInput(initialPhone ?? "");
  const [phoneDigits, setPhoneDigits] = useState(initialDigits);
  const [phoneDisplay, setPhoneDisplay] = useState(() =>
    initialDigits ? formatTurkishMobileDisplay(initialDigits) : "",
  );
  const [birthDate, setBirthDate] = useState(() => normalizeBirthInput(initialBirthDate));

  const hasBirth = Boolean(birthDate);

  function syncPhone(raw: string) {
    const next = normalizeTurkishMobileInput(raw);
    setPhoneDigits(next);
    setPhoneDisplay(next ? formatTurkishMobileDisplay(next) : "");
  }

  return (
    <section id="profil" className="scroll-mt-24 rounded-2xl border border-[#e8dfd3]/85 bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-6 shadow-[0_12px_30px_rgba(62,53,42,0.06),0_2px_10px_rgba(0,0,0,0.03)] sm:p-7">
      <h2 className="font-serif text-xl text-stone-900">Profil bilgilerim</h2>
      <p className="mt-1 text-sm leading-relaxed text-stone-500">
        Sipariş ve iletişim için kullandığımız bilgiler. İstersen buradan güncelleyebilirsin.
      </p>

      <div className="mt-5 rounded-lg border border-[#e8dfd3]/60 bg-white/50 px-4 py-3 text-sm text-stone-600">
        <span className="text-xs font-medium uppercase tracking-[0.1em] text-stone-500">E-posta</span>
        <p className="mt-1 font-medium text-stone-900">{email}</p>
      </div>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="phone" value={phoneDigits} readOnly aria-hidden />

        <div>
          <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-stone-800">
            Ad Soyad
          </label>
          <input
            id="profile-name"
            name="full_name"
            type="text"
            required
            minLength={2}
            disabled={pending}
            value={fullName}
            onChange={(e) => setFullName(formatTurkishFullNameLive(e.target.value))}
            onBlur={() => setFullName((v) => normalizeTurkishFullName(v))}
            autoComplete="name"
            className={profileFieldClass}
          />
        </div>

        <div>
          <label htmlFor="profile-phone" className="mb-1 block text-sm font-medium text-stone-800">
            Telefon
          </label>
          <input
            id="profile-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            disabled={pending}
            placeholder="05XX XXX XX XX"
            value={phoneDisplay}
            onChange={(e) => syncPhone(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              syncPhone(e.clipboardData.getData("text/plain") ?? "");
            }}
            className={profileFieldClass}
          />
        </div>

        <div>
          <label htmlFor="profile-birth" className="mb-1 block text-sm font-medium text-stone-800">
            Doğum tarihi
          </label>
          <input
            id="profile-birth"
            name="birth_date"
            type="date"
            disabled={pending}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className={profileFieldClass}
          />
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            {hasBirth
              ? "Doğum gününde sana özel sürpriz indirim seni bekliyor ✨"
              : "Doğum gününü ekle, sana özel sürpriz indirimi kaçırma ✨"}
          </p>
        </div>

        {state && !state.ok ? (
          <p className="rounded-lg border border-stone-200/90 bg-stone-50 px-3 py-2 text-sm text-stone-700" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.ok ? (
          <p className="text-sm text-stone-600" role="status">
            Bilgilerin kaydedildi.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="hesabim-btn-lux rounded-full px-6 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </form>
    </section>
  );
}
