import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSafeReturnPath } from "@/lib/account/safe-return-path";
import { LoginForm } from "@/components/account/LoginForm";

export const metadata: Metadata = {
  title: "Giriş",
  description: "Zelula hesabınıza giriş yapın.",
};

type Props = {
  searchParams: Promise<{
    next?: string | string[];
    reset?: string | string[];
    registered?: string | string[];
    error?: string | string[];
  }>;
};

export default async function GirisPage({ searchParams }: Props) {
  const sp = await searchParams;
  const rawNext = typeof sp.next === "string" ? sp.next : Array.isArray(sp.next) ? sp.next[0] : undefined;
  const safeNext = getSafeReturnPath(rawNext);
  const resetOk = (typeof sp.reset === "string" ? sp.reset : sp.reset?.[0]) === "ok";
  const registered = (typeof sp.registered === "string" ? sp.registered : sp.registered?.[0]) === "1";
  const authCallbackError =
    (typeof sp.error === "string" ? sp.error : sp.error?.[0]) === "auth_callback";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(safeNext);

  return (
    <main className="container-premium py-16 sm:py-20">
      <div className="mx-auto max-w-md">
        <p className="editorial-kicker text-center">Hesap</p>
        <h1 className="mt-2 text-center font-serif text-3xl text-stone-900">Giriş yap</h1>
        <p className="mt-2 text-center text-sm text-stone-600">
          Siparişlerinizi takip edin ve profilinizi yönetin.
        </p>
        <div className="mt-10 rounded-2xl border border-[#e8dfd3] bg-[color:var(--surface)] p-8 shadow-sm">
          {registered ? (
            <p
              className="mb-5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-2.5 text-sm text-emerald-900"
              role="status"
            >
              Hesabınız oluşturuldu. E-postanızdaki onay bağlantısına tıkladıktan sonra giriş yapabilirsiniz.
            </p>
          ) : null}
          {resetOk ? (
            <p
              className="mb-5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-2.5 text-sm text-emerald-900"
              role="status"
            >
              Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
            </p>
          ) : null}
          {authCallbackError ? (
            <p
              className="mb-5 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 text-sm text-amber-950"
              role="alert"
            >
              Giriş bağlantısı geçersiz veya süresi dolmuş. Lütfen tekrar deneyin veya şifre sıfırlama isteyin.
            </p>
          ) : null}
          <LoginForm defaultNext={safeNext} />
        </div>
        <p className="mt-8 text-center text-xs text-stone-500">
          <Link href="/" className="underline-offset-2 hover:underline">
            Ana sayfaya dön
          </Link>
        </p>
      </div>
    </main>
  );
}
