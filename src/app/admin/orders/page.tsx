import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminOrdersListShell } from "@/components/admin/orders/AdminOrdersListShell";
import { AdminOrdersPurgePanel } from "@/components/admin/orders/AdminOrdersPurgePanel";
import { fetchAdminOrdersList } from "@/lib/admin/fetch-admin-orders-list";
import { ADMIN_OPERATIONS_MAIN } from "@/lib/admin/admin-shell-layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

import { ORDER_LIST_FILTER_IDS, normalizeOrdersListFilter } from "@/lib/orders/fulfillment-stage";

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
    redirect("/admin/orders?filter=new");
  }

  const activeFilter = ORDER_LIST_FILTER_IDS.has(filterRaw)
    ? normalizeOrdersListFilter(filterRaw)
    : "all";

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
  const [{ orders, loadError }, allOrdersRes] = await Promise.all([
    fetchAdminOrdersList(admin, activeFilter),
    activeFilter === "all"
      ? Promise.resolve({ orders: [] as Awaited<ReturnType<typeof fetchAdminOrdersList>>["orders"], loadError: null })
      : fetchAdminOrdersList(admin, "all"),
  ]);
  const ordersForQueueCounts = activeFilter === "all" ? orders : allOrdersRes.orders;

  const queueCounts = {
    paymentPending: ordersForQueueCounts.filter(
      (o) => o.order_status !== "cancelled" && String(o.payment_status ?? "") !== "paid",
    ).length,
    newOrders: ordersForQueueCounts.filter(
      (o) =>
        o.payment_status === "paid" &&
        o.order_status !== "cancelled" &&
        (o.order_status === "pending" || o.order_status === "confirmed"),
    ).length,
    preparing: ordersForQueueCounts.filter(
      (o) => o.payment_status === "paid" && o.order_status === "processing",
    ).length,
    inTransit: ordersForQueueCounts.filter((o) => o.order_status === "shipped").length,
  };

  return (
    <main className={`${ADMIN_OPERATIONS_MAIN} pb-8 pt-5 lg:pt-7`}>
      <header className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Operasyon</p>
        <h1 className="mt-1 font-serif text-3xl font-light tracking-tight text-stone-950">Siparişler</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          Ara, filtrele ve toplu işlem yapın. Kargo ve etiket için sipariş satırından detaya girin.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/orders?filter=payment_pending"
            className="rounded-full border border-amber-200/90 bg-amber-50/80 px-3 py-1 text-[11px] font-semibold text-amber-950 hover:bg-amber-100/90"
          >
            Ödeme bekleyen · {queueCounts.paymentPending.toLocaleString("tr-TR")}
          </Link>
          <Link
            href="/admin/orders?filter=new"
            className="rounded-full border border-amber-200/90 bg-amber-50/80 px-3 py-1 text-[11px] font-semibold text-amber-950 hover:bg-amber-100/90"
          >
            Yeni gelen · {queueCounts.newOrders.toLocaleString("tr-TR")}
          </Link>
          <Link
            href="/admin/orders?filter=preparing"
            className="rounded-full border border-violet-200/90 bg-violet-50/70 px-3 py-1 text-[11px] font-semibold text-violet-950 hover:bg-violet-100/80"
          >
            Hazırlanıyor · {queueCounts.preparing.toLocaleString("tr-TR")}
          </Link>
          <Link
            href="/admin/orders?filter=in_transit"
            className="rounded-full border border-sky-200/90 bg-sky-50/70 px-3 py-1 text-[11px] font-semibold text-sky-950 hover:bg-sky-100/80"
          >
            Taşımada · {queueCounts.inTransit.toLocaleString("tr-TR")}
          </Link>
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
