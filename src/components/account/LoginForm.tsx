"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { EmailField } from "@/components/account/EmailField";
import { PasswordField } from "@/components/account/PasswordField";
import { isBasicValidEmail, normalizeEmailInput } from "@/lib/account/email-input";
import { cn } from "@/lib/utils";

const loginFieldClass =
  "w-full rounded-xl border border-[#e8dfd3] bg-[color:var(--surface)] pl-4 pr-4 py-2.5 text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-[color:var(--brand-gold)]/45 focus:ring-2 focus:ring-[color:var(--brand-gold)]/18 disabled:opacity-60";

export function LoginForm({ defaultNext = "/" }: { defaultNext?: string }) {
  const [state, formAction, pending] = useActionState(signIn, undefined);
  const [emailSubmitBlocked, setEmailSubmitBlocked] = useState(false);

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
      <input type="hidden" name="next" value={defaultNext} />
      <div>
        <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-stone-700">
          E-posta
        </label>
        <EmailField
          id="login-email"
          disabled={pending}
          inputClassName={loginFieldClass}
          submitBlocked={emailSubmitBlocked}
          onClearSubmitBlocked={() => setEmailSubmitBlocked(false)}
        />
      </div>
      <div>
        <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-stone-700">
          Şifre
        </label>
        <PasswordField
          id="login-password"
          autoComplete="current-password"
          disabled={pending}
          inputClassName={cn(loginFieldClass, "!pr-12")}
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
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
      <p className="text-center text-sm text-stone-600">
        Hesabınız yok mu?{" "}
        <Link href="/kayit" className="font-medium text-[color:var(--brand-gold)] underline-offset-2 hover:underline">
          Kayıt ol
        </Link>
      </p>
    </form>
  );
}
