import { type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardRecentOrdersPanel } from "@/components/admin/DashboardRecentOrdersPanel";
import { AdminOperationsDock } from "@/components/admin/AdminOperationsDock";
import { ADMIN_ORDERS_LIST_SELECT, istanbulDayUtcRange } from "@/lib/admin/admin-orders-list";
import { ADMIN_OPERATIONS_MAIN } from "@/lib/admin/admin-shell-layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AdminAnalyticsSection } from "@/components/admin/dashboard/AdminAnalyticsSection";
import { ProductHealthPanel } from "@/components/admin/dashboard/ProductHealthPanel";
import { fetchDashboardProductCounts } from "@/lib/admin/dashboard-product-counts";
import { resolveAnalyticsRange } from "@/lib/admin/analytics-range";
import { fetchAnalyticsSectionData } from "@/lib/admin/fetch-analytics-section";

export const dynamic = "force-dynamic";

function splitTryParts(n: number): { main: string; decimals: string } {
  const full = n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const i = full.lastIndexOf(",");
  if (i === -1) return { main: full, decimals: "00" };
  return { main: full.slice(0, i), decimals: full.slice(i + 1) };
}

function TryPriceSplit({ n, className }: { n: number; className?: string }) {
  const { main, decimals } = splitTryParts(n);
  return (
    <span className={`inline-flex items-baseline gap-0 tabular-nums ${className ?? ""}`}>
      <span>{main}</span>
      <span className="text-[0.62em] font-medium text-stone-500">,{decimals}</span>
      <span className="ml-0.5 text-[0.55em] font-semibold text-stone-400">₺</span>
    </span>
  );
}

function kpiCountDeltaTr(current: number, previous: number): ReactNode {
  const d = current - previous;
  if (d === 0) return <span className="font-medium text-stone-500">Dünle aynı</span>;
  const sign = d > 0 ? "+" : "−";
  const abs = Math.abs(d).toLocaleString("tr-TR");
  const tone = d > 0 ? "text-emerald-700" : "text-rose-700";
  return (
    <span className={`font-semibold ${tone}`}>
      {sign}
      {abs} dünden
    </span>
  );
}

function kpiRevenueDeltaTr(current: number, previous: number): ReactNode {
  const d = Math.round((current - previous) * 100) / 100;
  if (d === 0) return <span className="font-medium text-stone-500">Dünle aynı</span>;
  const sign = d > 0 ? "+" : "−";
  const abs = Math.abs(d);
  const tone = d > 0 ? "text-emerald-700" : "text-rose-700";
  const { main, decimals } = splitTryParts(abs);
  return (
    <span className={`inline-flex items-baseline gap-0.5 font-semibold tabular-nums ${tone}`}>
      <span>{sign}</span>
      <span>
        {main},{decimals} ₺
      </span>
      <span className="text-[10px] font-medium opacity-90">dünden</span>
    </span>
  );
}

/** Bir önceki İstanbul takvim günü */
function istanbulYesterdayUtcRange(): { start: Date; end: Date } {
  const { start: todayStart } = istanbulDayUtcRange();
  const justBeforeToday = new Date(todayStart.getTime() - 1);
  const ymd = justBeforeToday.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  return {
    start: new Date(`${ymd}T00:00:00+03:00`),
    end: new Date(`${ymd}T23:59:59.999+03:00`),
  };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    trendyolImported?: string;
    trendyolUpdated?: string;
    trendyolDeactivated?: string;
    trendyolFetched?: string;
    trendyolImportError?: string;
    trendyolTestOk?: string;
    trendyolTestError?: string;
    trendyolApprovedCount?: string;
    trendyolTotalCount?: string;
    trendyolSample?: string;
    trendyolTestSellerId?: string;
    trendyolTestEnv?: string;
    trendyolTestEndpoint?: string;
    trendyolOrdersProcessed?: string;
    trendyolOrderStockUpdated?: string;
    trendyolOrderUnmatched?: string;
    trendyolOrderDuplicate?: string;
    trendyolOrderRestored?: string;
    analyticsRange?: string;
    analyticsFrom?: string;
    analyticsTo?: string;
  }>;
}) {
  const sp = await searchParams;
  const tab = String(sp.tab ?? "").trim().toLowerCase();
  if (tab === "settings") redirect("/admin/settings");
  if (tab === "products") redirect("/admin/products");
  if (tab === "trendyol") redirect("/admin/trendyol");

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
  const analyticsRange = resolveAnalyticsRange({
    analyticsRange: sp.analyticsRange,
    analyticsFrom: sp.analyticsFrom,
    analyticsTo: sp.analyticsTo,
  });
  const { start: dayStart, end: dayEnd } = istanbulDayUtcRange();
  const { start: yStart, end: yEnd } = istanbulYesterdayUtcRange();

  const [
    todayOrdersRes,
    todayOrderItemsRes,
    recentOrdersListRes,
    yesterdayOrdersRes,
    pendingShipCountRes,
    pendingShipListRes,
    analyticsSectionData,
    productCounts,
    paidOrdersAllTimeRes,
  ] = await Promise.all([
    admin
      .from("orders")
      .select("id,total,payment_status,order_status,order_number,customer_name")
      .gte("created_at", dayStart.toISOString())
      .lte("created_at", dayEnd.toISOString())
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("order_items")
      .select("product_id,quantity,order:orders!inner(created_at,payment_status,order_status),product:products(name)")
      .gte("order.created_at", dayStart.toISOString())
      .lte("order.created_at", dayEnd.toISOString())
      .eq("order.payment_status", "paid")
      .neq("order.order_status", "cancelled")
      .limit(2000),
    admin.from("orders").select(ADMIN_ORDERS_LIST_SELECT).order("created_at", { ascending: false }).limit(50),
    admin
      .from("orders")
      .select("id,total,payment_status,order_status")
      .gte("created_at", yStart.toISOString())
      .lte("created_at", yEnd.toISOString())
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .in("order_status", ["pending", "confirmed"]),
    admin
      .from("orders")
      .select("id,order_number,total,customer_name,created_at,order_status")
      .eq("payment_status", "paid")
      .in("order_status", ["pending", "confirmed"])
      .order("created_at", { ascending: true })
      .limit(8),
    fetchAnalyticsSectionData(admin, analyticsRange),
    fetchDashboardProductCounts(admin),
    admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .neq("order_status", "cancelled"),
  ]);

  const todayOrders = todayOrdersRes.data ?? [];
  const recentOrdersList = recentOrdersListRes.data ?? [];
  const todayOrderItems = todayOrderItemsRes.data ?? [];
  const yesterdayOrders = yesterdayOrdersRes.data ?? [];
  const pendingShipmentCount = pendingShipCountRes.count ?? 0;
  const pendingShipQueue = pendingShipListRes.data ?? [];
  const paidOrdersAllTime = paidOrdersAllTimeRes.count ?? 0;

  const { activeProductsCount, outOfStockCount, lowStockCount, notListedOnMarketplaceCount } = productCounts;

  const ordersToday = todayOrders.length;
  const revenueToday = todayOrders
    .filter((o) => o.payment_status === "paid" && o.order_status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const ordersYesterday = yesterdayOrders.length;
  const revenueYesterday = yesterdayOrders
    .filter((o) => o.payment_status === "paid" && o.order_status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);

  const salesByProduct = new Map<string, { name: string; qty: number }>();
  for (const item of todayOrderItems) {
    const pid = String(item.product_id ?? "");
    if (!pid) continue;
    const name = String(item.product?.[0]?.name ?? "Ürün");
    const qty = Number(item.quantity ?? 0);
    const row = salesByProduct.get(pid) ?? { name, qty: 0 };
    row.qty += qty;
    salesByProduct.set(pid, row);
  }
  const topSellingProduct = [...salesByProduct.values()].sort((a, b) => b.qty - a.qty)[0] ?? null;
  const bestSellersToday = [...salesByProduct.entries()]
    .map(([productId, row]) => ({ productId, name: row.name, qty: row.qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const importedRaw = String(sp.trendyolImported ?? "").trim();
  const importedCount = Number(importedRaw);
  const hasImported = importedRaw.length > 0 && Number.isFinite(importedCount) && importedCount >= 0;
  const updatedRaw = String(sp.trendyolUpdated ?? "").trim();
  const updatedCount = Number(updatedRaw);
  const hasUpdated = updatedRaw.length > 0 && Number.isFinite(updatedCount) && updatedCount >= 0;
  const deactivatedRaw = String(sp.trendyolDeactivated ?? "").trim();
  const deactivatedCount = Number(deactivatedRaw);
  const hasDeactivated = deactivatedRaw.length > 0 && Number.isFinite(deactivatedCount) && deactivatedCount >= 0;
  const fetchedRaw = String(sp.trendyolFetched ?? "").trim();
  const fetchedCount = Number(fetchedRaw);
  const hasFetched = fetchedRaw.length > 0 && Number.isFinite(fetchedCount) && fetchedCount >= 0;
  const importError = String(sp.trendyolImportError ?? "").trim();
  const testError = String(sp.trendyolTestError ?? "").trim();
  const testOk = String(sp.trendyolTestOk ?? "").trim() === "1";
  const testSellerId = String(sp.trendyolTestSellerId ?? "").trim();
  const testEnv = String(sp.trendyolTestEnv ?? "").trim();
  const testEndpoint = String(sp.trendyolTestEndpoint ?? "").trim();
  const approvedTestCount = Number(String(sp.trendyolApprovedCount ?? "").trim());
  const totalTestCount = Number(String(sp.trendyolTotalCount ?? "").trim());
  const testSample = String(sp.trendyolSample ?? "").trim();
  const ordersProcessedRaw = String(sp.trendyolOrdersProcessed ?? "").trim();
  const ordersProcessed = Number(ordersProcessedRaw);
  const hasOrdersProcessed = ordersProcessedRaw.length > 0 && Number.isFinite(ordersProcessed) && ordersProcessed >= 0;
  const stockUpdatedRaw = String(sp.trendyolOrderStockUpdated ?? "").trim();
  const stockUpdated = Number(stockUpdatedRaw);
  const hasStockUpdated = stockUpdatedRaw.length > 0 && Number.isFinite(stockUpdated) && stockUpdated >= 0;
  const unmatchedRaw = String(sp.trendyolOrderUnmatched ?? "").trim();
  const unmatchedCount = Number(unmatchedRaw);
  const hasUnmatched = unmatchedRaw.length > 0 && Number.isFinite(unmatchedCount) && unmatchedCount >= 0;
  const duplicateRaw = String(sp.trendyolOrderDuplicate ?? "").trim();
  const duplicateCount = Number(duplicateRaw);
  const hasDuplicate = duplicateRaw.length > 0 && Number.isFinite(duplicateCount) && duplicateCount >= 0;
  const restoredRaw = String(sp.trendyolOrderRestored ?? "").trim();
  const restoredCount = Number(restoredRaw);
  const hasRestored = restoredRaw.length > 0 && Number.isFinite(restoredCount) && restoredCount >= 0;

  return (
    <>
      <main className={`${ADMIN_OPERATIONS_MAIN} pb-28 pt-5 lg:pb-24 lg:pt-7`}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Operasyon</p>
            <h1 className="mt-1 font-serif text-3xl font-light tracking-tight text-stone-950">Kontrol paneli</h1>
            <p className="mt-1 text-sm text-stone-600">Bugün müdahale gerektiren işler ve satış özeti.</p>
          </div>
          <Link
            href="/admin/products/new"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-800/15 bg-stone-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
          >
            + Ürün ekle
          </Link>
        </div>

        {importError ? (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Trendyol import hatası: {importError}
          </div>
        ) : null}
        {testError ? (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Trendyol bağlantı testi başarısız: {testError}
            {testEnv || testSellerId || testEndpoint ? (
              <div className="mt-2 space-y-1 text-xs text-rose-900/90">
                {testEnv ? <p>Ortam: {testEnv}</p> : null}
                {testSellerId ? <p>seller_id: {testSellerId}</p> : null}
                {testEndpoint ? <p>Endpoint: {testEndpoint}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {testOk ? (
          <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <p className="font-medium">Trendyol bağlantı testi tamamlandı.</p>
            <div className="mt-2 space-y-1 text-xs text-sky-900/90">
              {testEnv ? <p>Ortam: {testEnv}</p> : null}
              {testSellerId ? <p>seller_id: {testSellerId}</p> : null}
              {testEndpoint ? <p>Endpoint: {testEndpoint}</p> : null}
            </div>
            {testSample || Number.isFinite(approvedTestCount) || Number.isFinite(totalTestCount) ? (
              <p className="mt-1 text-xs text-sky-700">
                approved={Number.isFinite(approvedTestCount) ? approvedTestCount : 0}, total=
                {Number.isFinite(totalTestCount) ? totalTestCount : 0}, sample={testSample || "-"}
              </p>
            ) : null}
          </div>
        ) : null}
        {hasImported ? (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {importedCount.toLocaleString("tr-TR")} ürün eklendi
            {hasUpdated ? `, ${updatedCount.toLocaleString("tr-TR")} ürün güncellendi` : ""}
            {hasDeactivated ? `, ${deactivatedCount.toLocaleString("tr-TR")} ürün pasife alındı` : ""}
            {hasFetched ? ` (${fetchedCount.toLocaleString("tr-TR")} ürün bulundu)` : ""}
          </div>
        ) : null}
        {hasOrdersProcessed ? (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p>{ordersProcessed.toLocaleString("tr-TR")} Trendyol siparişi işlendi.</p>
            <p className="mt-1">
              {hasStockUpdated ? `${stockUpdated.toLocaleString("tr-TR")} ürün stoğu güncellendi` : "0 ürün stoğu güncellendi"}
              {hasUnmatched ? ` · ${unmatchedCount.toLocaleString("tr-TR")} ürün eşleşmedi` : ""}
              {hasDuplicate ? ` · ${duplicateCount.toLocaleString("tr-TR")} tekrar kayıt atlandı` : ""}
              {hasRestored ? ` · ${restoredCount.toLocaleString("tr-TR")} siparişte stok iadesi yapıldı` : ""}
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-stone-200/50 bg-white/90 px-3 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Bugün · Sipariş</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-stone-950">
                {ordersToday.toLocaleString("tr-TR")}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-stone-600">{kpiCountDeltaTr(ordersToday, ordersYesterday)}</p>
            </div>
            <div className="rounded-2xl border border-stone-200/50 bg-white/90 px-3 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Yeni gelen</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-stone-950">
                {pendingShipmentCount.toLocaleString("tr-TR")}
              </p>
              <Link
                href="/admin/orders?queue=ship"
                className="mt-1 inline-block text-[10px] font-semibold text-[#8a734f] underline-offset-2 hover:underline"
              >
                Kuyruğu aç →
              </Link>
            </div>
            <div className="rounded-2xl border border-stone-200/50 bg-white/90 px-3 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Stokta yok</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-stone-950">
                {outOfStockCount.toLocaleString("tr-TR")}
              </p>
              <Link
                href="/admin/products?status=active&stock=out"
                className="mt-1 inline-block text-[10px] font-semibold text-[#8a734f] underline-offset-2 hover:underline"
              >
                Katalog →
              </Link>
            </div>
            <div className="rounded-2xl border border-stone-200/50 bg-white/90 px-3 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Az stok</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-stone-950">
                {lowStockCount.toLocaleString("tr-TR")}
              </p>
              <Link
                href="/admin/products?status=active&stock=low"
                className="mt-1 inline-block text-[10px] font-semibold text-[#8a734f] underline-offset-2 hover:underline"
              >
                Katalog →
              </Link>
            </div>
            <div className="rounded-2xl border border-stone-200/50 bg-white/90 px-3 py-3 shadow-sm sm:col-span-2 xl:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Ciro (bugün)</p>
              <div className="mt-0.5">
                <TryPriceSplit n={revenueToday} className="text-xl font-semibold tracking-tight text-stone-900" />
              </div>
              <p className="mt-0.5 text-[10px] leading-snug text-stone-600">{kpiRevenueDeltaTr(revenueToday, revenueYesterday)}</p>
            </div>
          </div>

          <DashboardRecentOrdersPanel
            orders={recentOrdersList.map((o) => ({
              id: String(o.id),
              total: Number(o.total ?? 0),
              payment_status: String(o.payment_status ?? ""),
              order_status: String(o.order_status ?? ""),
              order_number: String(o.order_number ?? ""),
              customer_name: String(o.customer_name ?? ""),
              created_at: String(o.created_at ?? ""),
              shipping_status: (o.shipping_status as string | null) ?? null,
              shipping_provider: (o.shipping_provider as string | null) ?? null,
              shipping_tracking_number: (o.shipping_tracking_number as string | null) ?? null,
            }))}
            pendingShipOrders={pendingShipQueue.map((o) => ({
              id: String(o.id),
              order_number: String(o.order_number ?? ""),
              total: Number(o.total ?? 0),
              customer_name: String(o.customer_name ?? ""),
              created_at: String(o.created_at ?? ""),
              order_status: String(o.order_status ?? ""),
            }))}
            dayStartIso={dayStart.toISOString()}
            dayEndIso={dayEnd.toISOString()}
          />

          <ProductHealthPanel
            outOfStockCount={outOfStockCount}
            lowStockCount={lowStockCount}
            notListedOnMarketplaceCount={notListedOnMarketplaceCount}
          />

          <section>
            <h2 className="text-base font-semibold text-stone-950">Bugün yapılacaklar</h2>
            <p className="mt-1 text-sm text-stone-700">Küçük adımlar; büyük etki. Bugün bitmesi iyi olanlar.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {outOfStockCount > 0 ? (
                <Link
                  href="/admin/products?status=active&stock=out"
                  className="group flex flex-col rounded-2xl border border-stone-200/75 border-l-[3px] border-l-rose-500 bg-gradient-to-r from-rose-50/40 to-white p-3.5 shadow-[0_2px_14px_-6px_rgba(28,25,23,0.05)] transition-all hover:-translate-y-px hover:border-stone-300/80 hover:shadow-[0_5px_20px_-8px_rgba(28,25,23,0.08)] hover:ring-1 hover:ring-stone-200/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-800">Stok</p>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-900">
                      Acil
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-stone-950">
                    {outOfStockCount.toLocaleString("tr-TR")} ürün stokta yok — acil
                  </p>
                  <p className="mt-2 flex-1 text-sm font-medium text-stone-800">
                    Satış durur — stok gir veya ürünü pasife al.
                  </p>
                  <span className="mt-3 text-sm font-bold text-stone-800 group-hover:underline">Stokları aç →</span>
                </Link>
              ) : null}
              <Link
                href="/admin/products?status=active&trendyol=missing"
                className="group flex flex-col rounded-2xl border border-stone-200/75 border-l-[3px] border-l-stone-300 bg-white p-3.5 shadow-[0_2px_14px_-6px_rgba(28,25,23,0.05)] transition-all hover:-translate-y-px hover:border-stone-300/80 hover:shadow-[0_5px_20px_-8px_rgba(28,25,23,0.08)] hover:ring-1 hover:ring-stone-200/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-800">Trendyol</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      notListedOnMarketplaceCount > 0 ? "bg-amber-100 text-amber-950" : "bg-stone-200/90 text-stone-700"
                    }`}
                  >
                    {notListedOnMarketplaceCount > 0 ? "Şimdi" : "Tamam"}
                  </span>
                </div>
                <p className="mt-2 text-lg font-bold text-stone-950">
                  {notListedOnMarketplaceCount === 0
                    ? "Liste tam"
                    : `${notListedOnMarketplaceCount.toLocaleString("tr-TR")} ürün Trendyol'da yok veya eksik`}
                </p>
                <p className="mt-2 flex-1 text-sm font-medium text-stone-800">
                  {notListedOnMarketplaceCount > 0
                    ? "Alan eksik veya gönderim bekliyor — düzelt, sonra tek tıkla gönder."
                    : "Gönderimi bugün kapat; vitrin trafiği pazaryerine aksın."}
                </p>
                <span className="mt-3 text-sm font-bold text-stone-800 group-hover:underline">Listeyi aç →</span>
              </Link>
              <Link
                href="/admin/products"
                className="group flex flex-col rounded-2xl border border-stone-200/75 border-l-[3px] border-l-stone-300 bg-white p-3.5 shadow-[0_2px_14px_-6px_rgba(28,25,23,0.05)] transition-all hover:-translate-y-px hover:border-stone-300/80 hover:shadow-[0_5px_20px_-8px_rgba(28,25,23,0.08)] hover:ring-1 hover:ring-stone-200/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-800">Satış</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      topSellingProduct
                        ? "bg-stone-200/90 text-stone-800"
                        : paidOrdersAllTime === 0
                          ? "bg-stone-200/90 text-stone-700"
                          : "bg-sky-100/90 text-sky-900"
                    }`}
                  >
                    {topSellingProduct ? "Tamam" : paidOrdersAllTime === 0 ? "Hedef" : "Bilgi"}
                  </span>
                </div>
                {topSellingProduct ? (
                  <>
                    <p className="mt-2 text-lg font-bold text-stone-950">
                      Bugün lider: {topSellingProduct.name} ({topSellingProduct.qty} adet)
                    </p>
                    <p className="mt-2 flex-1 text-sm font-medium text-stone-800">
                      İkinci satışı yakalamak için stoğu ve fiyatı kilitle; benzer ürünü vitrine al.
                    </p>
                    <span className="mt-3 text-sm font-bold text-stone-800 group-hover:underline">Ürüne git →</span>
                  </>
                ) : paidOrdersAllTime === 0 ? (
                  <>
                    <p className="mt-2 text-lg font-bold text-stone-950">İlk satışa son düzlük</p>
                    <p className="mt-2 flex-1 text-sm font-medium text-stone-800">
                      Görsel + net fiyat + Trendyol gönderimi — bugün vitrini canlı tut, dönüşümü bekleme.
                    </p>
                    <span className="mt-3 text-sm font-bold text-stone-800 group-hover:underline">Kataloğu aç →</span>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-lg font-bold text-stone-950">Bugün henüz satış yok</p>
                    <p className="mt-2 flex-1 text-sm font-medium text-stone-800">
                      Dünkü liderle kıyasla bugün vitrini güçlü tut.
                    </p>
                    <span className="mt-3 text-sm font-bold text-stone-800 group-hover:underline">Kataloğu aç →</span>
                  </>
                )}
              </Link>
            </div>
          </section>

          <div id="analytics">
            <AdminAnalyticsSection data={analyticsSectionData} bestSellersToday={bestSellersToday} />
          </div>
        </div>
      </main>
      <AdminOperationsDock pendingShipmentCount={pendingShipmentCount} />
    </>
  );
}
