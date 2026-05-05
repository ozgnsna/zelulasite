"use client";

import { useState } from "react";
import { signInAdmin } from "@/app/actions/admin";
import { EmailField } from "@/components/account/EmailField";
import { PasswordField } from "@/components/account/PasswordField";
import { isBasicValidEmail, normalizeEmailInput } from "@/lib/account/email-input";
import { cn } from "@/lib/utils";

const adminField =
  "w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-4 pr-4 text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-400/25";

export function AdminLoginForm() {
  const [emailSubmitBlocked, setEmailSubmitBlocked] = useState(false);

  return (
    <form
      action={signInAdmin}
      className="mt-8 space-y-3 rounded-2xl border border-stone-200 bg-white p-6"
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        const em = normalizeEmailInput(String(fd.get("email") ?? ""));
        if (!isBasicValidEmail(em)) {
          e.preventDefault();
          setEmailSubmitBlocked(true);
        }
      }}
    >
      <EmailField
        id="admin-email"
        placeholder="Yetkili e-posta adresiniz"
        inputClassName={adminField}
        submitBlocked={emailSubmitBlocked}
        onClearSubmitBlocked={() => setEmailSubmitBlocked(false)}
      />
      <PasswordField
        id="admin-password"
        autoComplete="current-password"
        placeholder="Şifrenizi girin"
        inputClassName={cn(adminField, "!pr-12")}
      />
      <p className="-mt-0.5 text-xs text-stone-500">E-posta ve şifre bilgilerinizi eksiksiz giriniz.</p>
      <button
        type="submit"
        className="w-full rounded-xl bg-stone-900 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
      >
        Giriş Yap
      </button>
    </form>
  );
}
