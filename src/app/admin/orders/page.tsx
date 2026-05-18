import { redirect } from "next/navigation";
import { AdminOrdersListShell } from "@/components/admin/orders/AdminOrdersListShell";
import { AdminOrdersPurgePanel } from "@/components/admin/orders/AdminOrdersPurgePanel";
import { fetchAdminOrdersList } from "@/lib/admin/fetch-admin-orders-list";
import { ADMIN_OPERATIONS_MAIN } from "@/lib/admin/admin-shell-layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FILTER_IDS = new Set([
  "all",
  "today",
  "ship_ready",
  "payment_pending",
  "processing",
  "done",
]);

export default async function AdminOrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string; filter?: string; purgeOk?: string; purgeCount?: string; purgeErr?: string }>;
}) {
  const sp = await searchParams;
  const queue = String(sp.queue ?? "").trim();
  const purgeOk = sp.purgeOk;
  const purgeCount = sp.purgeCount;
  const purgeErr = sp.purgeErr;
  const filterRaw = String(sp.filter ?? "").trim();
  if (queue === "ship" && !filterRaw) {
    redirect("/admin/orders?filter=ship_ready");
  }

  const activeFilter = FILTER_IDS.has(filterRaw) ? filterRaw : "all";

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

  const admin = createAdminClient();
  const { orders, loadError } = await fetchAdminOrdersList(admin, activeFilter);

  return (
    <main className={`${ADMIN_OPERATIONS_MAIN} pb-3 pt-2 sm:pb-4 sm:pt-2.5`}>
      <header className="mb-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-0.5 border-b border-stone-200/55 pb-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <h1 className="font-serif text-base font-light tracking-tight text-stone-900 sm:text-lg">Siparişler</h1>
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-400">Operasyon</span>
          </div>
          <p className="mt-0.5 max-w-xl text-[10px] leading-tight text-stone-600">
            Ara, filtrele, toplu işlem — kargo ve etiket için satıra girin.
          </p>
        </div>
      </header>

      {loadError ? (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Sipariş listesi yüklenemedi: {loadError}. Supabase migration’larını (özellikle{" "}
          <code className="text-[10px]">orders</code> kargo kolonları) kontrol edin veya Vercel{" "}
          <code className="text-[10px]">SUPABASE_SERVICE_ROLE_KEY</code> değerini doğrulayın.
        </p>
      ) : null}

      <AdminOrdersListShell orders={orders} activeFilter={activeFilter} />

      <AdminOrdersPurgePanel purgeOk={purgeOk} purgeCount={purgeCount} purgeErr={purgeErr} />
    </main>
  );
}
