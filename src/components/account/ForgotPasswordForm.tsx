"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { EmailField } from "@/components/account/EmailField";
import { isBasicValidEmail, normalizeEmailInput } from "@/lib/account/email-input";

const fieldClass =
  "w-full rounded-xl border border-[#e8dfd3] bg-[color:var(--surface)] pl-4 pr-4 py-2.5 text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-[color:var(--brand-gold)]/45 focus:ring-2 focus:ring-[color:var(--brand-gold)]/18 disabled:opacity-60";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined);
  const [emailSubmitBlocked, setEmailSubmitBlocked] = useState(false);

  if (state?.ok && state.message) {
    return (
      <ForgotPasswordSent message={state.message} />
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        const em = normalizeEmailInput(String(fd.get("email") ?? ""));
        if (!isBasicValidEmail(em)) {
          e.preventDefault();
          setEmailSubmitBlocked(true);
        }
      }}
    >
      <div>
        <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-stone-700">
          E-posta
        </label>
        <EmailField
          id="forgot-email"
          disabled={pending}
          inputClassName={fieldClass}
          submitBlocked={emailSubmitBlocked}
          onClearSubmitBlocked={() => setEmailSubmitBlocked(false)}
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
        {pending ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
      </button>
      <p className="text-center text-sm text-stone-600">
        <Link href="/giris" className="font-medium text-[color:var(--brand-gold)] underline-offset-2 hover:underline">
          Giriş sayfasına dön
        </Link>
      </p>
    </form>
  );
}

function ForgotPasswordSent({ message }: { message: string }) {
  return (
    <div className="space-y-5">
      <p
        className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-2.5 text-sm text-emerald-900"
        role="status"
      >
        {message}
      </p>
      <p className="text-center text-sm text-stone-600">
        <Link href="/giris" className="font-medium text-[color:var(--brand-gold)] underline-offset-2 hover:underline">
          Giriş sayfasına dön
        </Link>
      </p>
    </div>
  );
}
