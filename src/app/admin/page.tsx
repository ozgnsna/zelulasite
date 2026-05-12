import { Fragment, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardRecentOrdersPanel } from "@/components/admin/DashboardRecentOrdersPanel";
import {
  fetchTrendyolOrdersAction,
  importTrendyolProductsAction,
  testTrendyolConnectionAction,
} from "@/app/actions/admin";
import { AdminOperationsDock } from "@/components/admin/AdminOperationsDock";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildDashboardAnalyticsMetrics } from "@/lib/admin/analytics-dashboard";

export const dynamic = "force-dynamic";

function toTry(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

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

/** Europe/Istanbul takvim günü (hosting UTC iken “bugün” sapmasını önler) */
function istanbulDayUtcRange(): { start: Date; end: Date } {
  const ymd = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  return {
    start: new Date(`${ymd}T00:00:00+03:00`),
    end: new Date(`${ymd}T23:59:59.999+03:00`),
  };
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

function shortenOrderNumberDisplay(orderNumber: string): string {
  const s = String(orderNumber ?? "").trim();
  if (s.length <= 18) return s;
  return `${s.slice(0, 10)}…${s.slice(-4)}`;
}

function formatOrderRelativeTimeTr(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diffMs = Math.max(0, Date.now() - t);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa. önce`;
  const days = Math.floor(hours / 24);
  if (days < 8) return `${days} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
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
  const { start: dayStart, end: dayEnd } = istanbulDayUtcRange();
  const { start: yStart, end: yEnd } = istanbulYesterdayUtcRange();

  const [todayOrdersRes, todayAnalyticsRes, productsRes, todayOrderItemsRes, recentOrdersListRes, yesterdayOrdersRes, pendingShipCountRes, pendingShipListRes] =
    await Promise.all([
    admin
      .from("orders")
      .select("id,total,payment_status,order_status,order_number,customer_name")
      .gte("created_at", dayStart.toISOString())
      .lte("created_at", dayEnd.toISOString())
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("analytics_events")
      .select("event_name,client_id,ecommerce")
      .gte("occurred_at", dayStart.toISOString())
      .lte("occurred_at", dayEnd.toISOString())
      .limit(3000),
    admin
      .from("products")
      .select("id,name,stock_quantity,is_active,trendyol_active,trendyol_barcode,trendyol_stock_code,trendyol_category_id,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("order_items")
      .select("product_id,quantity,order:orders!inner(created_at,payment_status,order_status),product:products(name)")
      .gte("order.created_at", dayStart.toISOString())
      .lte("order.created_at", dayEnd.toISOString())
      .eq("order.payment_status", "paid")
      .neq("order.order_status", "cancelled")
      .limit(2000),
    admin
      .from("orders")
      .select("id,total,payment_status,order_status,order_number,customer_name,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
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
      .in("order_status", ["pending", "confirmed", "processing"]),
    admin
      .from("orders")
      .select("id,order_number,total,customer_name,created_at,order_status")
      .eq("payment_status", "paid")
      .in("order_status", ["pending", "confirmed", "processing"])
      .order("created_at", { ascending: true })
      .limit(8),
  ]);

  const todayOrders = todayOrdersRes.data ?? [];
  const recentOrdersList = recentOrdersListRes.data ?? [];
  const todayAnalytics = todayAnalyticsRes.data ?? [];
  const products = productsRes.data ?? [];
  const todayOrderItems = todayOrderItemsRes.data ?? [];
  const yesterdayOrders = yesterdayOrdersRes.data ?? [];
  const pendingShipmentCount = pendingShipCountRes.count ?? 0;
  const pendingShipQueue = pendingShipListRes.data ?? [];

  const ordersToday = todayOrders.length;
  const revenueToday = todayOrders
    .filter((o) => o.payment_status === "paid" && o.order_status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const ordersYesterday = yesterdayOrders.length;
  const revenueYesterday = yesterdayOrders
    .filter((o) => o.payment_status === "paid" && o.order_status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const dashboardAnalytics = buildDashboardAnalyticsMetrics(todayAnalytics);
  const addToCartToday = dashboardAnalytics.addToCarts;
  const viewItemToday = dashboardAnalytics.productViews;
  const purchaseToday = dashboardAnalytics.purchases;
  const topViewedMaxViews =
    dashboardAnalytics.topViewedProducts.length > 0
      ? Math.max(...dashboardAnalytics.topViewedProducts.map((r) => r.views))
      : 1;

  const lowStockCount = products.filter((p) => Boolean(p.is_active) && Number(p.stock_quantity ?? 0) > 0 && Number(p.stock_quantity ?? 0) <= 3).length;
  const missingMarketplaceCount = products.filter((p) => {
    if (!Boolean(p.trendyol_active)) return false;
    return [String(p.trendyol_barcode ?? "").trim(), String(p.trendyol_stock_code ?? "").trim(), String(p.trendyol_category_id ?? "").trim()].some((v) => !v);
  }).length;
  const activeProductsCount = products.filter((p) => Boolean(p.is_active)).length;
  const notListedOnMarketplaceCount = products.filter((p) => {
    if (!Boolean(p.is_active)) return false;
    if (!Boolean(p.trendyol_active)) return true;
    return [String(p.trendyol_barcode ?? "").trim(), String(p.trendyol_stock_code ?? "").trim(), String(p.trendyol_category_id ?? "").trim()].some((v) => !v);
  }).length;
  const productsAddedTodayInSlice = products.filter((p) => {
    const raw = String((p as { created_at?: string }).created_at ?? "").trim();
    if (!raw) return false;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) && t >= dayStart.getTime() && t <= dayEnd.getTime();
  }).length;
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
  const trendyolIssueCount = notListedOnMarketplaceCount + missingMarketplaceCount;
  const bestSellersToday = [...salesByProduct.entries()]
    .map(([productId, row]) => ({ productId, name: row.name, qty: row.qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  const hasPaidOrderInRecent = recentOrdersList.some(
    (o) => o.payment_status === "paid" && String(o.order_status ?? "") !== "cancelled",
  );
  const storeProgressSteps = [
    { key: "products", label: "Ürün vitrinı", done: activeProductsCount > 0 },
    {
      key: "marketplace",
      label: "Pazaryeri tam",
      done: activeProductsCount > 0 && notListedOnMarketplaceCount === 0,
    },
    { key: "sale", label: "Ödenmiş satış", done: hasPaidOrderInRecent || revenueToday > 0 },
  ] as const;
  const storeProgressDone = storeProgressSteps.filter((s) => s.done).length;
  const storeProgressPct = Math.round((storeProgressDone / storeProgressSteps.length) * 100);
  const progressHighlightKey = storeProgressSteps.find((s) => !s.done)?.key ?? null;
  const nextProgressHint =
    progressHighlightKey === "products"
      ? "Sonraki adım: vitrine ürün ekleyerek ilk satışa yaklaş."
      : progressHighlightKey === "marketplace"
        ? "Sonraki adım: Trendyol alanlarını tamamlayıp gönder — checkout trafiği açılır."
        : progressHighlightKey === "sale"
          ? "Sonraki adım: ödenmiş sipariş akışını canlı tut (stok, kargo, bildirim)."
          : "Mağaza hazır görünüyor — yeni ürünlerde aynı ritmi koru.";
  const newestProductCreatedAt =
    products.length > 0
      ? String((products[0] as { created_at?: string }).created_at ?? "").trim() || undefined
      : undefined;
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

  const dashboardCheckedAtTr = new Date().toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-24 lg:pt-8">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Operasyon</p>
          <h1 className="mt-1 font-serif text-3xl font-light tracking-tight text-stone-950">Kontrol paneli</h1>
          <p className="mt-1 text-sm text-stone-600">Bugün müdahale gerektiren işler ve satış özeti.</p>
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
          {testEnv ? <p className="mt-2 text-xs text-sky-800">Ortam: {testEnv}</p> : null}
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

      <section id="analytics" className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-stone-200/50 bg-white/90 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Bugün · Sipariş</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-stone-950">
                {ordersToday.toLocaleString("tr-TR")}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-stone-600">{kpiCountDeltaTr(ordersToday, ordersYesterday)}</p>
            </div>
            <div className="rounded-2xl border border-stone-200/50 bg-white/90 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Kargoya hazır</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-stone-950">
                {pendingShipmentCount.toLocaleString("tr-TR")}
              </p>
              <Link href="/admin/orders?queue=ship" className="mt-2 inline-block text-[11px] font-semibold text-[#8a734f] underline-offset-2 hover:underline">
                Kuyruğu aç →
              </Link>
            </div>
            <div className="rounded-2xl border border-stone-200/50 bg-white/90 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Trendyol uyarı</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-stone-950">
                {trendyolIssueCount.toLocaleString("tr-TR")}
              </p>
              <Link href="/admin/trendyol" className="mt-2 inline-block text-[11px] font-semibold text-[#8a734f] underline-offset-2 hover:underline">
                Entegrasyon →
              </Link>
            </div>
            <div className="rounded-2xl border border-stone-200/50 bg-white/90 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Düşük stok</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-stone-950">
                {lowStockCount.toLocaleString("tr-TR")}
              </p>
              <Link href="/admin/products?stock=low" className="mt-2 inline-block text-[11px] font-semibold text-[#8a734f] underline-offset-2 hover:underline">
                Katalog →
              </Link>
            </div>
            <div className="rounded-2xl border border-stone-200/50 bg-white/90 p-4 shadow-sm sm:col-span-2 xl:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Ciro (bugün)</p>
              <div className="mt-1">
                <TryPriceSplit n={revenueToday} className="text-2xl font-semibold tracking-tight text-stone-900" />
              </div>
              <p className="mt-1 text-[11px] leading-snug text-stone-600">{kpiRevenueDeltaTr(revenueToday, revenueYesterday)}</p>
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
            }))}
            dayStartIso={dayStart.toISOString()}
            dayEndIso={dayEnd.toISOString()}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-stone-200/60 bg-white/95 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">Kargoya hazır siparişler</h2>
                  <p className="mt-0.5 text-xs text-stone-500">Ödendi · paketleme / kargo bekliyor</p>
                </div>
                <Link
                  href="/admin/orders?queue=ship"
                  className="shrink-0 rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
                >
                  Tümü
                </Link>
              </div>
              <ul className="mt-3 space-y-1">
                {pendingShipQueue.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-stone-200 bg-stone-50/80 px-2.5 py-4 text-center text-xs text-stone-500">
                    Bekleyen yok.
                  </li>
                ) : (
                  pendingShipQueue.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-stone-100/90 bg-stone-50/40 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-stone-900">{o.customer_name}</p>
                        <p className="font-mono text-[10px] text-stone-500">{shortenOrderNumberDisplay(String(o.order_number ?? ""))}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-xs font-semibold tabular-nums text-stone-800">
                          {Number(o.total ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                        </span>
                        <Link href={`/admin/orders/${o.id}`} className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-stone-800 ring-1 ring-stone-200/90 hover:bg-stone-50">
                          Aç
                        </Link>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-stone-200/60 bg-white/95 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">Trendyol & stok uyarıları</h2>
                  <p className="mt-0.5 text-xs text-stone-500">Pazaryeri ve kritik stok (son 200 ürün dilimi)</p>
                </div>
                <Link href="/admin/products" className="text-xs font-semibold text-[#8a734f] underline-offset-2 hover:underline">
                  Katalog
                </Link>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-stone-700">
                <li className="flex justify-between gap-2 rounded-xl bg-amber-50/80 px-3 py-2 ring-1 ring-amber-200/60">
                  <span>Eksik / yayında değil</span>
                  <span className="font-semibold tabular-nums text-stone-900">{notListedOnMarketplaceCount}</span>
                </li>
                <li className="flex justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2 ring-1 ring-stone-200/60">
                  <span>Alan eksik (aktif TY)</span>
                  <span className="font-semibold tabular-nums text-stone-900">{missingMarketplaceCount}</span>
                </li>
                <li className="flex justify-between gap-2 rounded-xl bg-rose-50/70 px-3 py-2 ring-1 ring-rose-200/50">
                  <span>Kritik stok (1–3)</span>
                  <span className="font-semibold tabular-nums text-stone-900">{lowStockCount}</span>
                </li>
              </ul>
            </div>
          </div>

          {bestSellersToday.length > 0 ? (
            <div className="rounded-2xl border border-stone-200/60 bg-white/95 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-stone-900">Bugün çok satanlar</h2>
                <Link href="/admin/products" className="text-xs font-semibold text-stone-600 underline-offset-2 hover:underline">
                  Katalogda aç
                </Link>
              </div>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {bestSellersToday.map((row, i) => (
                  <li
                    key={row.productId}
                    className="flex items-center justify-between gap-2 rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5 text-sm"
                  >
                    <span className="font-mono text-xs text-stone-400">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-stone-900">{row.name}</span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-stone-600">{row.qty} ad.</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Metric
              emphasis
              title="Aktif ürünler"
              value={activeProductsCount.toLocaleString("tr-TR")}
              trend={
                productsAddedTodayInSlice > 0 ? (
                  <span className="font-semibold text-emerald-800/90">
                    +{productsAddedTodayInSlice.toLocaleString("tr-TR")} bugün (son 200 diliminde)
                  </span>
                ) : (
                  <span className="font-medium text-stone-500">Bugün bu dilimde yeni ürün yok</span>
                )
              }
              helper={
                activeProductsCount === 0 ? (
                  <>Katalog boş — &quot;Yeni ürün ekle&quot; ile başla; ardından pazaryeri alanlarını doldur.</>
                ) : (
                  <>Son 200 ürün dilimi. Çeşitlendir: set, varyant, sezon — sepet değerini büyüt.</>
                )
              }
            />
            <Metric
              emphasis
              title="Pazaryerinde eksik"
              value={notListedOnMarketplaceCount.toLocaleString("tr-TR")}
              trend={<span className="font-medium text-stone-500">Canlı liste · dünle kıyas yok</span>}
              helper={
                notListedOnMarketplaceCount === 0 ? (
                  <>Bu dilimde tamam. Yeni ürün eklediğinde barkod, stok kodu ve kategoriyi anında kontrol et.</>
                ) : (
                  <>
                    Gönderim veya alan eksik.{" "}
                    <span className="font-semibold text-stone-900">Trendyol ekranında tamamla → gönder.</span>
                  </>
                )
              }
            />
          </div>
          <p className="text-center text-[11px] font-medium text-stone-500">
            Son kontrol: <span className="font-semibold text-stone-700">{dashboardCheckedAtTr}</span> · İstanbul
          </p>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
            <Link
              href="/admin/products/new"
              className="group flex h-full min-h-0 flex-col justify-between rounded-2xl border border-stone-200/85 bg-gradient-to-br from-[#faf9f6] via-[#f3f0ea] to-[#e8e4dc] p-5 shadow-[0_5px_24px_-12px_rgba(28,25,23,0.07)] transition-all hover:border-stone-300/95 hover:shadow-[0_8px_28px_-12px_rgba(28,25,23,0.09)]"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-600">Ana aksiyon</p>
                <p className="mt-2 font-serif text-2xl font-semibold tracking-tight text-stone-900">Yeni ürün ekle</p>
                <p className="mt-1.5 max-w-md text-[13px] font-medium leading-snug text-stone-700">
                  Oluştur → fiyat &amp; stok → vitrin ve Trendyol&apos;da yayın.
                </p>
                <ol className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-600">
                  <li className="rounded-full bg-white/85 px-2.5 py-1 ring-1 ring-stone-200/90">1 Oluştur</li>
                  <li aria-hidden className="px-0.5 text-stone-400">
                    →
                  </li>
                  <li className="rounded-full bg-white/85 px-2.5 py-1 ring-1 ring-stone-200/90">2 Fiyat</li>
                  <li aria-hidden className="px-0.5 text-stone-400">
                    →
                  </li>
                  <li className="rounded-full bg-white/85 px-2.5 py-1 ring-1 ring-stone-200/90">3 Yayın</li>
                </ol>
              </div>
              <div className="mt-4">
                <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-stone-950 px-5 py-3 text-sm font-bold text-white shadow-[0_4px_18px_-4px_rgba(0,0,0,0.28)] ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.32)] hover:ring-white/20 active:translate-y-0">
                  Ürün oluştur
                  <span className="transition group-hover:translate-x-0.5" aria-hidden>
                    →
                  </span>
                </span>
                <p className="mt-2 max-w-sm text-[11px] font-medium leading-snug text-stone-600">
                  Hızlı başlangıç: isim + stok + bir görsel yeter — detayı sonra rafine edersin; vitrin hemen canlanır.
                </p>
              </div>
            </Link>

            <section className="flex h-full min-h-0 flex-col rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_5px_22px_-12px_rgba(28,25,23,0.07)] ring-1 ring-stone-900/[0.025]">
              <div className="border-b border-stone-100/90 pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-900">Trendyol pazaryeri</h2>
                    <p className="mt-1 text-xs text-stone-600">Gönderim, senkron, bağlantı</p>
                  </div>
                  <div className="text-right text-[10px] font-semibold leading-tight text-stone-500">
                    <p>
                      <span className="font-medium uppercase tracking-wide text-stone-400">Panel</span>{" "}
                      <span className="tabular-nums text-stone-700">{dashboardCheckedAtTr}</span>
                    </p>
                    {newestProductCreatedAt ? (
                      <p className="mt-1.5">
                        <span className="block uppercase tracking-wide text-stone-400">Son eklenen</span>
                        <span className="mt-0.5 block tabular-nums text-stone-800">{formatOrderRelativeTimeTr(newestProductCreatedAt)}</span>
                      </p>
                    ) : (
                      <p className="mt-1.5 font-medium text-stone-400">Liste boş</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex-1">
                {notListedOnMarketplaceCount > 0 ? (
                  <div className="rounded-xl border border-amber-300/55 bg-amber-50/85 px-3.5 py-3">
                    <p className="text-sm font-bold text-amber-950">
                      {notListedOnMarketplaceCount.toLocaleString("tr-TR")} ürün gönderilmeyi bekliyor
                    </p>
                    <p className="mt-1 text-[11px] font-medium leading-snug text-amber-900/85">Pazaryeri kapalı veya zorunlu alan eksik.</p>
                    <Link
                      href="/admin/trendyol"
                      className="mt-2.5 inline-flex w-full items-center justify-center rounded-lg bg-amber-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700 hover:shadow-md active:scale-[0.99]"
                    >
                      Hemen gönder
                    </Link>
                  </div>
                ) : (
                  <p className="rounded-lg border border-emerald-200/70 bg-emerald-50/60 px-3 py-2 text-[11px] font-medium text-emerald-900">
                    Bekleyen gönderim yok (bu dilim).
                  </p>
                )}
                <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">İşlemler</p>
                <ul className="mt-2 space-y-1.5">
                  <li>
                    <Link
                      href="/admin/trendyol"
                      className="flex w-full items-center justify-between rounded-lg border border-stone-200/90 bg-stone-50/70 px-3 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-stone-300 hover:bg-white hover:shadow-sm"
                    >
                      Ürünleri gönder
                      <span className="text-stone-400" aria-hidden>
                        →
                      </span>
                    </Link>
                  </li>
                  <li>
                    <form action={importTrendyolProductsAction}>
                      <button
                        type="submit"
                        className="flex w-full items-center justify-between rounded-lg border border-stone-200/90 bg-stone-50/70 px-3 py-2.5 text-left text-sm font-semibold text-stone-900 transition hover:border-stone-300 hover:bg-white hover:shadow-sm"
                      >
                        Senkronize et
                        <span className="text-[11px] font-normal text-stone-500">Çek</span>
                      </button>
                    </form>
                  </li>
                  <li>
                    <form action={fetchTrendyolOrdersAction}>
                      <button
                        type="submit"
                        className="flex w-full items-center justify-between rounded-lg border border-stone-200/90 bg-stone-50/70 px-3 py-2.5 text-left text-sm font-semibold text-stone-900 transition hover:border-stone-300 hover:bg-white hover:shadow-sm"
                      >
                        Trendyol siparişlerini çek
                        <span className="text-[11px] font-normal text-stone-500">Stok</span>
                      </button>
                    </form>
                  </li>
                  <li>
                    <form action={testTrendyolConnectionAction}>
                      <button
                        type="submit"
                        className="flex w-full items-center justify-between rounded-lg border border-stone-200/90 bg-stone-50/70 px-3 py-2.5 text-left text-sm font-semibold text-stone-900 transition hover:border-stone-300 hover:bg-white hover:shadow-sm"
                      >
                        Bağlantıyı test et
                        <span className="text-[11px] font-normal text-stone-500">API</span>
                      </button>
                    </form>
                  </li>
                </ul>
              </div>
              <Link
                href="/admin/products"
                className="mt-3 block text-center text-[11px] font-semibold text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline"
              >
                Katalog: ürünleri yönet →
              </Link>
            </section>
          </div>

          <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_6px_28px_-14px_rgba(28,25,23,0.08)] ring-1 ring-stone-900/[0.035]">
            <div className="flex items-center gap-3">
              <span className="h-11 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#c4b59a] to-stone-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-800">Mağaza ilerlemesi</h2>
                <p className="mt-0.5 text-xs text-stone-600">Ürün · Pazaryeri · Ödenmiş satış</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Hazırlık</p>
                <p className="text-5xl font-black tabular-nums leading-none tracking-tight text-stone-950">{storeProgressPct}%</p>
                <p className="mt-0.5 text-[10px] font-semibold text-stone-500">hazır</p>
              </div>
            </div>
            <div className="mt-5 h-3.5 w-full overflow-hidden rounded-full bg-stone-100 ring-1 ring-stone-200/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-stone-400 via-[#b0a08c] to-[#9c8b73] shadow-[0_1px_4px_rgba(28,25,23,0.08)]"
                style={{ width: `${storeProgressPct}%` }}
              />
            </div>
            <p className="mt-2.5 text-xs font-medium leading-snug text-stone-600">{nextProgressHint}</p>
            <ol className="mt-5 grid gap-2.5 sm:grid-cols-3">
              {storeProgressSteps.map((s) => {
                const isCurrent = !s.done && progressHighlightKey === s.key;
                return (
                  <li
                    key={s.key}
                    className={`rounded-lg px-2.5 py-2.5 text-xs font-semibold leading-tight ${
                      s.done
                        ? "border border-emerald-200/90 bg-emerald-50/80 text-emerald-950"
                        : isCurrent
                          ? "border-2 border-stone-800/30 bg-white text-stone-950 shadow-[0_3px_14px_-4px_rgba(28,25,23,0.08)] ring-2 ring-stone-900/[0.06]"
                          : "border border-stone-200/80 bg-stone-50/80 text-stone-600"
                    }`}
                  >
                    <span className={`mr-1 font-black ${s.done ? "text-emerald-700" : isCurrent ? "text-stone-800" : "text-stone-400"}`}>
                      {s.done ? "✓" : isCurrent ? "▶" : "○"}
                    </span>
                    {s.label}
                  </li>
                );
              })}
            </ol>
            {viewItemToday + addToCartToday + purchaseToday > 0 ? (
              <p className="mt-3 text-[11px] font-medium text-stone-500">
                Vitrin (örneklem): {viewItemToday.toLocaleString("tr-TR")} görüntüleme · {addToCartToday.toLocaleString("tr-TR")} sepet ·{" "}
                {purchaseToday.toLocaleString("tr-TR")} ödeme olayı
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-stone-200/75 bg-[#f9f7f3]/80 p-5 shadow-[0_3px_16px_-8px_rgba(28,25,23,0.06)]">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-800">Bugünün odağı</h2>
            <ul className="mt-4 space-y-4">
              <li className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-sm font-bold text-stone-400" aria-hidden>
                  →
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Trendyol</span>
                  <p className="mt-1 text-[14px] font-bold leading-snug text-stone-950">
                    {notListedOnMarketplaceCount > 0
                      ? `Checkout’a giden yolu aç: ${notListedOnMarketplaceCount.toLocaleString("tr-TR")} ürünü bugün gönder.`
                      : "Tam görünürlük: yeni ürünlerde barkod & kategori — ilk dış satışa zemin."}
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-sm font-bold text-stone-400" aria-hidden>
                  →
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Ürün</span>
                  <p className="mt-1 text-[14px] font-bold leading-snug text-stone-950">
                    {activeProductsCount === 0
                      ? "İlk vitrin ürününü yayınla — güven ve keşif başlasın."
                      : `${activeProductsCount.toLocaleString("tr-TR")} vitrin ürünü — bugün birini öne çıkar, sepete ivme ver.`}
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-sm font-bold text-stone-400" aria-hidden>
                  →
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Satış</span>
                  <p className="mt-1 text-[14px] font-bold leading-snug text-stone-950">
                    {revenueToday > 0
                      ? "Ciroyu sürdür: kargoyu netleştir, stokta tut — tekrar siparişe zemin."
                      : "İlk ödenmiş siparişi hedefle: fiyat + vitrin + pazaryeri aynı gün."}
                  </p>
                </div>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-stone-950">Bugün yapılacaklar</h2>
            <p className="mt-1 text-sm text-stone-700">Küçük adımlar; büyük etki. Bugün bitmesi iyi olanlar.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/admin/products"
                className={`group flex flex-col rounded-2xl border border-stone-200/75 bg-white p-3.5 shadow-[0_2px_14px_-6px_rgba(28,25,23,0.05)] transition-all hover:-translate-y-px hover:border-stone-300/80 hover:shadow-[0_5px_20px_-8px_rgba(28,25,23,0.08)] hover:ring-1 hover:ring-stone-200/40 ${
                  lowStockCount > 0 ? "border-l-[3px] border-l-rose-500 bg-gradient-to-r from-rose-50/40 to-white" : "border-l-[3px] border-l-stone-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-800">Stok</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      lowStockCount > 0 ? "bg-rose-100 text-rose-900" : "bg-stone-200/90 text-stone-700"
                    }`}
                  >
                    {lowStockCount > 0 ? "Acele" : "Tamam"}
                  </span>
                </div>
                <p className="mt-2 text-lg font-bold text-stone-950">
                  {lowStockCount === 0 ? "Kritik stok yok" : `${lowStockCount.toLocaleString("tr-TR")} ürün tükenmek üzere`}
                </p>
                <p className="mt-2 flex-1 text-sm font-medium text-stone-800">
                  {lowStockCount === 0
                    ? "Yine de fiyat ve görselleri taze tut — dönüşüm düşmesin."
                    : "Şimdi miktar gir — satış yarıda kalmasın; birkaç adet bile yetişir."}
                </p>
                <span className="mt-3 text-sm font-bold text-stone-800 group-hover:underline">Stokları aç →</span>
              </Link>
              <Link
                href="/admin/trendyol"
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
                    ? "Liste tam (bu dilim)"
                    : `${notListedOnMarketplaceCount.toLocaleString("tr-TR")} ürün Trendyol’da yok veya eksik`}
                </p>
                <p className="mt-2 flex-1 text-sm font-medium text-stone-800">
                  {missingMarketplaceCount > 0
                    ? `${missingMarketplaceCount.toLocaleString("tr-TR")} kayıtta alan eksik — düzelt, sonra tek tıkla gönder.`
                    : "Gönderimi bugün kapat; vitrin trafiği pazaryerine aksın."}
                </p>
                <span className="mt-3 text-sm font-bold text-stone-800 group-hover:underline">Gönder ve tamamla →</span>
              </Link>
              <Link
                href="/admin/products"
                className="group flex flex-col rounded-2xl border border-stone-200/75 border-l-[3px] border-l-stone-300 bg-white p-3.5 shadow-[0_2px_14px_-6px_rgba(28,25,23,0.05)] transition-all hover:-translate-y-px hover:border-stone-300/80 hover:shadow-[0_5px_20px_-8px_rgba(28,25,23,0.08)] hover:ring-1 hover:ring-stone-200/40 sm:col-span-2 lg:col-span-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-800">Satış</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      topSellingProduct ? "bg-stone-200/90 text-stone-800" : "bg-stone-200/90 text-stone-700"
                    }`}
                  >
                    {topSellingProduct ? "Tamam" : "Hedef"}
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
                ) : (
                  <>
                    <p className="mt-2 text-lg font-bold text-stone-950">İlk satışa son düzlük</p>
                    <p className="mt-2 flex-1 text-sm font-medium text-stone-800">
                      Görsel + net fiyat + Trendyol gönderimi — bugün vitrini canlı tut, dönüşümü bekleme.
                    </p>
                    <span className="mt-3 text-sm font-bold text-stone-800 group-hover:underline">Kataloğu aç →</span>
                  </>
                )}
              </Link>
            </div>
          </section>

          <section
            aria-label="Analytics özeti"
            className="rounded-xl border border-stone-200/45 bg-stone-50/35 p-2.5 shadow-sm ring-1 ring-stone-900/[0.02] sm:p-3"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Analytics · bugün</h2>
                <p className="text-[10px] leading-tight text-stone-500">Vitrin olayları · ikincil özet</p>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
              <Metric compact title="Ziyaretçi" value={dashboardAnalytics.visitorsToday.toLocaleString("tr-TR")} />
              <Metric compact title="Görüntüleme" value={dashboardAnalytics.productViews.toLocaleString("tr-TR")} />
              <Metric compact title="Sepete ekleme" value={dashboardAnalytics.addToCarts.toLocaleString("tr-TR")} />
              <Metric compact title="Checkout" value={dashboardAnalytics.checkoutStarts.toLocaleString("tr-TR")} />
              <Metric compact title="Satın alma" value={dashboardAnalytics.purchases.toLocaleString("tr-TR")} />
              <Metric
                compact
                title="Dönüşüm"
                value={`${dashboardAnalytics.conversionRate.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}%`}
              />
            </div>

            <div className="mt-2 rounded-lg border border-stone-200/40 bg-white/60 p-2">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-400">Dönüşüm hunisi</p>
              <div className="flex min-w-0 items-stretch gap-0.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:gap-0 sm:overflow-visible sm:pb-0">
                {(
                  [
                    { label: "Görüntüleme", value: dashboardAnalytics.funnel.view_item },
                    { label: "Sepet", value: dashboardAnalytics.funnel.add_to_cart },
                    { label: "Checkout", value: dashboardAnalytics.funnel.begin_checkout },
                    { label: "Satın alma", value: dashboardAnalytics.funnel.purchase },
                  ] as const
                ).map((step, i) => (
                  <Fragment key={step.label}>
                    {i > 0 ? (
                      <span className="flex shrink-0 items-center justify-center px-0.5 text-stone-300 sm:px-0" aria-hidden>
                        <ChevronRight className="size-3.5 sm:size-3" strokeWidth={2} />
                      </span>
                    ) : null}
                    <div className="flex min-w-[4.75rem] flex-1 flex-col justify-center rounded-md border border-stone-200/55 bg-white px-1.5 py-1 text-center shadow-[0_1px_0_0_rgba(28,25,23,0.03)] sm:min-w-0">
                      <span className="text-[8px] font-semibold uppercase leading-tight tracking-wide text-stone-500">
                        {step.label}
                      </span>
                      <span className="mt-0.5 text-[13px] font-bold tabular-nums leading-none text-stone-900">
                        {step.value.toLocaleString("tr-TR")}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>

            <div className="mt-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-400">En çok görüntülenen</p>
              {dashboardAnalytics.topViewedProducts.length === 0 ? (
                <p className="mt-1 text-[11px] text-stone-500">Henüz veri yok.</p>
              ) : (
                <ul className="mt-1 divide-y divide-stone-200/50 rounded-md border border-stone-200/40 bg-white/70">
                  {dashboardAnalytics.topViewedProducts.map((row) => (
                    <li key={row.productId} className="flex items-center gap-2 px-2 py-1 sm:py-1">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium leading-tight text-stone-800">{row.productName}</p>
                        <div className="mt-0.5 h-0.5 w-full max-w-[8rem] overflow-hidden rounded-full bg-stone-200/90">
                          <div
                            className="h-full rounded-full bg-stone-400/90"
                            style={{ width: `${Math.round((row.views / topViewedMaxViews) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-stone-900/[0.06] px-1.5 py-px text-[10px] font-bold tabular-nums text-stone-800">
                        {row.views.toLocaleString("tr-TR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </section>

    </main>
      <AdminOperationsDock pendingShipmentCount={pendingShipmentCount} />
    </>
  );
}

function Metric({
  title,
  value,
  valueNode,
  trend,
  helper,
  className,
  valueClassName,
  emphasis,
  compact,
}: {
  title: string;
  value?: string;
  valueNode?: ReactNode;
  trend?: ReactNode;
  helper?: ReactNode;
  className?: string;
  valueClassName?: string;
  emphasis?: boolean;
  /** Analytics / snapshot KPI: kısa kart, küçük etiket, sıkı boşluk */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <article
        className={`rounded-md border border-stone-200/50 bg-white px-2 py-1.5 shadow-[0_1px_0_0_rgba(28,25,23,0.04)] ${className ?? ""}`}
      >
        <p className="text-[8.5px] font-semibold uppercase leading-tight tracking-[0.1em] text-stone-500">{title}</p>
        <div
          className={`mt-0.5 text-xl font-semibold tabular-nums leading-none tracking-tight text-stone-950 ${valueClassName ?? ""}`}
        >
          {valueNode ?? value}
        </div>
      </article>
    );
  }

  const shell = emphasis
    ? "rounded-2xl border border-stone-200/80 bg-[linear-gradient(165deg,#fffdfb_0%,#f7f4ef_100%)] p-5 shadow-[0_4px_20px_-8px_rgba(28,25,23,0.06)] ring-1 ring-stone-900/[0.04]"
    : "rounded-2xl border border-stone-200/70 bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-4 shadow-[0_2px_14px_-6px_rgba(28,25,23,0.05)]";
  return (
    <article className={`${shell} ${className ?? ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-700">{title}</p>
      <div className={`mt-2 font-serif text-2xl font-semibold tracking-tight text-stone-950 ${valueClassName ?? ""}`}>
        {valueNode ?? value}
      </div>
      {trend ? <p className="mt-1.5 text-[11px] leading-snug text-stone-600">{trend}</p> : null}
      {helper ? <p className="mt-2 text-[12px] leading-relaxed text-stone-700">{helper}</p> : null}
    </article>
  );
}
