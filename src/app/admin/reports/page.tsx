import Link from "next/link";
import { redirect } from "next/navigation";
import { ADMIN_OPERATIONS_MAIN } from "@/lib/admin/admin-shell-layout";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? "")) redirect("/admin/login");

  return (
    <main className={`${ADMIN_OPERATIONS_MAIN} py-8 sm:py-10 lg:py-12`}>
      <h1 className="font-serif text-2xl font-light text-stone-900 sm:text-3xl">Raporlar</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
        Satış hunisi ve ürün görüntülenmeleri kontrol panelindeki analitik bölümünde özetlenir.
      </p>
      <Link
        href="/admin#analytics"
        className="mt-6 inline-flex rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
      >
        Analitiği aç
      </Link>
    </main>
  );
}
