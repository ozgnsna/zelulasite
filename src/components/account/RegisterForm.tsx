"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { formatTurkishFullNameLive, normalizeTurkishFullName } from "@/lib/account/turkish-full-name";
import {
  formatTurkishMobileDisplay,
  isValidTurkishMobileDigits,
  normalizeTurkishMobileInput,
} from "@/lib/account/turkish-mobile-phone";
import { EmailField } from "@/components/account/EmailField";
import { PasswordField } from "@/components/account/PasswordField";
import { isBasicValidEmail, normalizeEmailInput } from "@/lib/account/email-input";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-[#e8dfd3]/90 bg-[linear-gradient(180deg,#ffffff_0%,#faf8f5_100%)] pl-4 pr-4 py-2.5 text-stone-900 outline-none transition-all duration-200 ease-out placeholder:text-stone-400 focus:border-[#C6A36D] focus:bg-white focus:shadow-[0_0_0_2px_rgba(198,163,109,0.15)] focus:ring-0 disabled:opacity-60";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(signUp, undefined);
  const [fullName, setFullName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [phoneBlurred, setPhoneBlurred] = useState(false);
  const [phoneSubmitAttempted, setPhoneSubmitAttempted] = useState(false);
  const [passwordTooShort, setPasswordTooShort] = useState(false);
  const [emailSubmitBlocked, setEmailSubmitBlocked] = useState(false);

  const phoneValid = isValidTurkishMobileDigits(phoneDigits);
  const showPhoneSoftError = (phoneBlurred || phoneSubmitAttempted) && !phoneValid;

  function syncPhoneFromRaw(raw: string) {
    const next = normalizeTurkishMobileInput(raw);
    setPhoneDigits(next);
    setPhoneDisplay(formatTurkishMobileDisplay(next));
  }

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        const em = normalizeEmailInput(String(fd.get("email") ?? ""));
        if (!isBasicValidEmail(em)) {
          e.preventDefault();
          setEmailSubmitBlocked(true);
        }
        const pw = String(fd.get("password") ?? "");
        if (pw.length < 8) {
          e.preventDefault();
          setPasswordTooShort(true);
        }
        if (!isValidTurkishMobileDigits(phoneDigits)) {
          e.preventDefault();
          setPhoneSubmitAttempted(true);
        }
      }}
    >
      <input type="hidden" name="phone" value={phoneDigits} readOnly aria-hidden />

      <div className="space-y-4">
        <div>
          <label htmlFor="reg-name" className="mb-1 block text-sm font-medium text-stone-700">
            Ad Soyad
          </label>
          <input
            id="reg-name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            disabled={pending}
            placeholder="Adınız Soyadınız"
            value={fullName}
            onChange={(e) => setFullName(formatTurkishFullNameLive(e.target.value))}
            onBlur={() => setFullName((v) => normalizeTurkishFullName(v))}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-stone-700">
            E-posta
          </label>
          <EmailField
            id="reg-email"
            disabled={pending}
            inputClassName={fieldClass}
            submitBlocked={emailSubmitBlocked}
            onClearSubmitBlocked={() => setEmailSubmitBlocked(false)}
          />
        </div>
        <div>
          <label htmlFor="reg-password" className="mb-1 block text-sm font-medium text-stone-700">
            Şifre
          </label>
          <PasswordField
            id="reg-password"
            autoComplete="new-password"
            disabled={pending}
            showStrength
            helperText="En az 8 karakter, bir büyük harf ve bir rakam kullanmanı öneririz."
            showMinLengthError={passwordTooShort}
            onValueChange={(v) => {
              if (v.length >= 8) setPasswordTooShort(false);
            }}
            inputClassName={cn(fieldClass, "!pr-12")}
          />
        </div>
      </div>

      <div className="!mt-3 space-y-4 border-t border-[#e8dfd3]/80 pt-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">İletişim</p>
        <div>
          <label htmlFor="reg-phone" className="mb-1 block text-sm font-medium text-stone-700">
            Telefon
          </label>
          <input
            id="reg-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            disabled={pending}
            placeholder="05XX XXX XX XX"
            value={phoneDisplay}
            onChange={(e) => {
              syncPhoneFromRaw(e.target.value);
            }}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData("text/plain") ?? "";
              syncPhoneFromRaw(text);
            }}
            onBlur={() => {
              setPhoneBlurred(true);
            }}
            aria-invalid={showPhoneSoftError}
            aria-describedby="reg-phone-helper reg-phone-hint"
            className={cn(
              fieldClass,
              showPhoneSoftError &&
                "border-rose-200/80 focus:border-rose-300/50 focus:bg-white focus:shadow-[0_0_0_2px_rgba(210,170,165,0.2)] focus:ring-0",
            )}
          />
          <p id="reg-phone-helper" className="mt-1.5 text-xs text-stone-500 transition-opacity duration-200">
            Sipariş ve kargo sürecin için kullanılır
          </p>
          <p
            id="reg-phone-hint"
            role={showPhoneSoftError ? "alert" : undefined}
            aria-hidden={!showPhoneSoftError}
            className={cn(
              "mt-1 text-xs text-rose-600/80 transition-opacity duration-200 ease-out",
              showPhoneSoftError ? "opacity-100" : "sr-only",
            )}
          >
            Geçerli bir telefon numarası gir
          </p>
        </div>
        <div>
          <label htmlFor="reg-birth" className="mb-1 block text-sm font-medium text-stone-700">
            Doğum tarihi
          </label>
          <input id="reg-birth" name="birth_date" type="date" disabled={pending} className={fieldClass} />
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            Doğru girersen doğum gününde sana özel sürpriz indirim seni bekliyor ✨
          </p>
        </div>
      </div>

      {state && !state.ok ? (
        <p
          className="rounded-xl border border-stone-200/80 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state && state.ok && state.message ? (
        <p className="rounded-xl border border-emerald-100/80 bg-emerald-50/60 px-3.5 py-2.5 text-sm text-emerald-900" role="status">
          {state.message}
        </p>
      ) : null}

      <ul
        className="mt-4 mb-2 list-none space-y-2.5 text-left text-sm leading-relaxed text-stone-500"
        aria-label="Hesap oluşturmanın avantajları"
      >
        <li className="flex gap-2.5">
          <span className="mt-[0.2em] shrink-0 text-[0.65rem] font-normal text-[#C6A36D]/90" aria-hidden>
            ✓
          </span>
          <span>Siparişlerini kolayca takip et</span>
        </li>
        <li className="flex gap-2.5">
          <span className="mt-[0.2em] shrink-0 text-[0.65rem] font-normal text-[#C6A36D]/90" aria-hidden>
            ✓
          </span>
          <span>Sana özel indirimlere ilk sen ulaş</span>
        </li>
        <li className="flex gap-2.5">
          <span className="mt-[0.2em] shrink-0 text-[0.65rem] font-normal text-[#C6A36D]/90" aria-hidden>
            ✓
          </span>
          <span>Doğum gününe özel sürpriz seni bekliyor 🎁</span>
        </li>
      </ul>

      <button
        type="submit"
        disabled={pending}
        className="register-cta w-full rounded-full bg-[color:var(--brand-gold)] px-6 py-3 text-sm font-medium text-stone-900 shadow-sm hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm"
      >
        {pending ? "Kayıt oluşturuluyor…" : "Zelula\u2019ya katıl"}
      </button>
      <p className="mt-2.5 text-center text-xs text-stone-500">
        Bilgilerin güvende. Asla paylaşılmaz.
      </p>
      <p className="text-center text-sm text-stone-600">
        Zaten hesabınız var mı?{" "}
        <Link href="/giris" className="font-medium text-[color:var(--brand-gold)] underline-offset-2 hover:underline">
          Giriş yap
        </Link>
      </p>
    </form>
  );
}
