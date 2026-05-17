import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/account/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Şifremi unuttum",
  description: "Zelula hesabınız için şifre sıfırlama bağlantısı isteyin.",
};

type Props = { searchParams: Promise<{ error?: string | string[] }> };

export default async function SifremiUnuttumPage({ searchParams }: Props) {
  const sp = await searchParams;
  const err = typeof sp.error === "string" ? sp.error : Array.isArray(sp.error) ? sp.error[0] : undefined;
  const linkExpired = err === "link_expired";

  return (
    <main className="container-premium py-16 sm:py-20">
      <div className="mx-auto max-w-md">
        <p className="editorial-kicker text-center">Hesap</p>
        <h1 className="mt-2 text-center font-serif text-3xl text-stone-900">Şifremi unuttum</h1>
        <p className="mt-2 text-center text-sm text-stone-600">
          Kayıtlı e-posta adresinize şifre sıfırlama bağlantısı göndeririz.
        </p>
        <div className="mt-10 rounded-2xl border border-[#e8dfd3] bg-[color:var(--surface)] p-8 shadow-sm">
          {linkExpired ? (
            <p
              className="mb-5 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 text-sm text-amber-950"
              role="alert"
            >
              Bağlantının süresi dolmuş veya geçersiz. Lütfen aşağıdan yeniden bağlantı isteyin.
            </p>
          ) : null}
          <ForgotPasswordForm />
        </div>
        <p className="mt-8 text-center text-xs text-stone-500">
          <Link href="/giris" className="underline-offset-2 hover:underline">
            Giriş sayfasına dön
          </Link>
        </p>
      </div>
    </main>
  );
}
