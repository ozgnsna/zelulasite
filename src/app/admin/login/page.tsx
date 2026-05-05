import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminLoginForm } from "@/components/account/AdminLoginForm";

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
      <AdminLoginForm />
    </main>
  );
}
