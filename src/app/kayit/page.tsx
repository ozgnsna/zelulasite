import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "@/components/account/RegisterForm";

export const metadata: Metadata = {
  title: "Kayıt",
  description: "Zelula için yeni hesap oluşturun.",
};

export default async function KayitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="register-page-main container-premium py-16 sm:py-20">
      <div className="relative z-[1] mx-auto max-w-md">
        <p className="editorial-kicker text-center">Hesap</p>
        <h1 className="mt-2 text-center font-serif text-3xl text-stone-900">Kayıt ol</h1>
        <p className="mt-3 text-center text-xs text-stone-500/90">
          3.847+ kişi Zelula hesabını oluşturdu
        </p>
        <div className="register-form-card mt-8 rounded-2xl border border-[#e8dfd3]/85 p-8">
          <RegisterForm />
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
