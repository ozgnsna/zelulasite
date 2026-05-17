import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/account/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Yeni şifre",
  description: "Zelula hesabınız için yeni şifre belirleyin.",
};

export default async function SifreYenilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="container-premium py-16 sm:py-20">
      <div className="mx-auto max-w-md">
        <p className="editorial-kicker text-center">Hesap</p>
        <h1 className="mt-2 text-center font-serif text-3xl text-stone-900">Yeni şifre belirle</h1>
        <p className="mt-2 text-center text-sm text-stone-600">
          E-postanızdaki bağlantıyı kullandıktan sonra yeni şifrenizi girin.
        </p>
        <div className="mt-10 rounded-2xl border border-[#e8dfd3] bg-[color:var(--surface)] p-8 shadow-sm">
          {user ? (
            <ResetPasswordForm />
          ) : (
            <div className="space-y-5">
              <p
                className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 text-sm text-amber-950"
                role="alert"
              >
                Oturum bulunamadı. Şifre sıfırlama bağlantısının süresi dolmuş olabilir; lütfen yeniden bağlantı
                isteyin.
              </p>
              <p className="text-center text-sm text-stone-600">
                <Link
                  href="/sifremi-unuttum"
                  className="font-medium text-[color:var(--brand-gold)] underline-offset-2 hover:underline"
                >
                  Şifre sıfırlama bağlantısı iste
                </Link>
              </p>
            </div>
          )}
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
