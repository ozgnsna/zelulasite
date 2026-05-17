"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updatePassword } from "@/app/actions/auth";
import { PasswordField } from "@/components/account/PasswordField";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-[#e8dfd3] bg-[color:var(--surface)] pl-4 pr-4 py-2.5 text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-[color:var(--brand-gold)]/45 focus:ring-2 focus:ring-[color:var(--brand-gold)]/18 disabled:opacity-60";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, undefined);
  const [passwordTooShort, setPasswordTooShort] = useState(false);

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(e) => {
        const pw = String(new FormData(e.currentTarget).get("password") ?? "");
        if (pw.length < 8) {
          e.preventDefault();
          setPasswordTooShort(true);
        }
      }}
    >
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-stone-700">
          Yeni şifre
        </label>
        <PasswordField
          id="new-password"
          name="password"
          autoComplete="new-password"
          disabled={pending}
          showStrength
          showMinLengthError={passwordTooShort}
          helperText="En az 8 karakter kullanın."
          inputClassName={cn(fieldClass, "!pr-12")}
          onValueChange={(v) => {
            if (v.length >= 8) setPasswordTooShort(false);
          }}
        />
      </div>
      {state && !state.ok ? (
        <p
          className="rounded-xl border border-stone-200/80 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[color:var(--brand-gold)] px-6 py-3 text-sm font-medium text-stone-900 shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Kaydediliyor…" : "Yeni şifreyi kaydet"}
      </button>
      <p className="text-center text-sm text-stone-600">
        <Link
          href="/sifremi-unuttum"
          className="font-medium text-[color:var(--brand-gold)] underline-offset-2 hover:underline"
        >
          Yeni bağlantı iste
        </Link>
      </p>
    </form>
  );
}
