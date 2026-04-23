import { redirect } from "next/navigation";
import { signInAdmin } from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/admin");

  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="font-serif text-3xl">Admin Giriş</h1>
      <p className="mt-2 text-sm text-stone-600">Ürün, stok, sipariş ve koleksiyon yönetimi.</p>
      <form action={signInAdmin} className="mt-8 space-y-3 rounded-2xl border border-stone-200 bg-white p-6">
        <input
          name="email"
          type="email"
          required
          placeholder="admin@zelula.com"
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5"
        />
        <button className="w-full rounded-xl bg-stone-900 py-2.5 text-sm font-medium text-white">
          Giriş Yap
        </button>
      </form>
    </main>
  );
}
