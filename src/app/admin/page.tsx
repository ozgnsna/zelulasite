import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { orderStatusLabel } from "@/lib/account/order-status";
import {
  fetchTrendyolOrdersAction,
  importTrendyolProductsAction,
  saveCategory,
  saveCollection,
  signOutAdmin,
  testTrendyolConnectionAction,
} from "@/app/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AdminTab = "analytics" | "products" | "trendyol" | "settings";

function tabLabel(tab: AdminTab) {
  if (tab === "analytics") return "Analiz";
  if (tab === "products") return "Ürünler";
  if (tab === "trendyol") return "Trendyol";
  return "Ayarlar";
}

function tabHref(tab: AdminTab) {
  if (tab === "products") return "/admin/products";
  if (tab === "trendyol") return "/admin/trendyol";
  return `/admin?tab=${tab}`;
}

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

function adminOrderListBadge(o: { payment_status: string; order_status: string }): { label: string; pill: string } {
  const label = orderStatusLabel(o);
  if (o.order_status === "cancelled") {
    return {
      label,
      pill: "rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-rose-50 text-rose-900 ring-rose-600/22",
    };
  }
  if (o.payment_status === "failed") {
    return {
      label,
      pill: "rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-rose-50 text-rose-900 ring-rose-600/22",
    };
  }
  if (o.order_status === "shipped") {
    return {
      label,
      pill: "rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-sky-50 text-sky-950 ring-sky-700/25",
    };
  }
  if (o.order_status === "processing") {
    return {
      label,
      pill: "rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-amber-50 text-amber-950 ring-amber-700/25",
    };
  }
  if (o.payment_status === "paid") {
    return {
      label,
      pill: "rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-emerald-50 text-emerald-950 ring-emerald-800/22",
    };
  }
  return {
    label,
    pill: "rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-stone-100 text-stone-800 ring-stone-500/14",
  };
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
  const tab = (sp.tab ?? "analytics") as AdminTab;
  const currentTab: AdminTab = ["analytics", "products", "trendyol", "settings"].includes(tab) ? tab : "analytics";
  if (currentTab === "trendyol") {
    redirect("/admin/trendyol");
  }

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

  const [todayOrdersRes, todayAnalyticsRes, productsRes, todayOrderItemsRes, recentOrdersListRes, yesterdayOrdersRes, categoriesRes, collectionsRes] =
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
      .select("event_name")
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
    admin.from("categories").select("id,name,slug,image_url").order("name", { ascending: true }).limit(100),
    admin.from("collections").select("id,name,slug,description,image_url").order("name", { ascending: true }).limit(100),
  ]);

  const todayOrders = todayOrdersRes.data ?? [];
  const recentOrdersList = recentOrdersListRes.data ?? [];
  const todayAnalytics = todayAnalyticsRes.data ?? [];
  const products = productsRes.data ?? [];
  const todayOrderItems = todayOrderItemsRes.data ?? [];
  const yesterdayOrders = yesterdayOrdersRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const collections = collectionsRes.data ?? [];

  const ordersToday = todayOrders.length;
  const revenueToday = todayOrders
    .filter((o) => o.payment_status === "paid" && o.order_status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const ordersYesterday = yesterdayOrders.length;
  const revenueYesterday = yesterdayOrders
    .filter((o) => o.payment_status === "paid" && o.order_status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const addToCartToday = todayAnalytics.filter((e) => e.event_name === "add_to_cart").length;
  const viewItemToday = todayAnalytics.filter((e) => e.event_name === "view_item").length;
  const purchaseToday = todayAnalytics.filter((e) => e.event_name === "purchase").length;

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
    <main className="container-premium bg-[#faf6ef]/65 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-stone-950">Kontrol paneli</h1>
          <p className="mt-1.5 text-sm font-medium text-stone-700">Bugünkü satış ve pazaryeri aksiyonları tek ekranda.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="rounded-xl border border-stone-300/90 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:border-stone-400 hover:bg-stone-50"
          >
            Ürünler
          </Link>
          <form action={signOutAdmin}>
            <button className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
              Çıkış Yap
            </button>
          </form>
        </div>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2">
        {(["analytics", "products", "trendyol", "settings"] as AdminTab[]).map((t) => (
          <Link
            key={t}
            href={tabHref(t)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              currentTab === t
                ? "border-[#c6a15b]/70 bg-[#faf4ea] text-stone-950 shadow-[0_6px_16px_rgba(198,161,91,0.2)] ring-1 ring-[#c6a15b]/20"
                : "border-stone-200 bg-white text-stone-800 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-950"
            }`}
          >
            {tabLabel(t)}
          </Link>
        ))}
      </nav>

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

      {currentTab === "analytics" ? (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              emphasis
              title="Bugünkü siparişler"
              value={ordersToday.toLocaleString("tr-TR")}
              trend={kpiCountDeltaTr(ordersToday, ordersYesterday)}
              helper={
                ordersToday === 0 ? (
                  <>Sonraki adım: ürün oluştur → fiyat &amp; stok → Trendyol&apos;da yayınla. İlk siparişe en kısa rota.</>
                ) : (
                  <>Siparişleri onayla / paketle; kargo bilgisini güncel tut. Son liste aşağıda.</>
                )
              }
            />
            <Metric
              emphasis
              title="Bugünkü ciro"
              valueNode={
                <TryPriceSplit
                  n={revenueToday}
                  className="text-3xl font-semibold tracking-tight text-stone-800 sm:text-[2rem]"
                />
              }
              trend={kpiRevenueDeltaTr(revenueToday, revenueYesterday)}
              className="border-stone-200/80 bg-[linear-gradient(165deg,#fafaf9_0%,#f4f1ec_100%)] shadow-[0_5px_22px_-10px_rgba(28,25,23,0.06)] ring-1 ring-stone-900/[0.035]"
              helper={
                revenueToday === 0 ? (
                  <>Dönüşüm: fiyat, ücretsiz kargo eşiği ve vitrin görsellerini netleştir; pazaryeri listesini tamamla.</>
                ) : (
                  <>Ciroyu koru: stok yenile, iade sürecini hızlandır, tamamlayıcı ürün ekle.</>
                )
              }
            />
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

          <section className="rounded-2xl border border-stone-200/75 bg-white p-4 shadow-[0_3px_18px_-8px_rgba(28,25,23,0.055)]">
            <h2 className="text-sm font-semibold text-stone-950">Son siparişler</h2>
            <p className="mt-0.5 text-[11px] font-medium text-stone-500">
              50 kayıt · kısa sipariş no · son yenileme {dashboardCheckedAtTr}
            </p>
            <ul className="mt-3 space-y-1.5">
              {recentOrdersList.length === 0 ? (
                <li className="rounded-xl border border-dashed border-stone-300 bg-stone-50/80 px-4 py-5 text-sm text-stone-700">
                  <p className="font-medium text-stone-900">Henüz sipariş yok</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700">
                    İlk sipariş için görselleri iyileştirin, fiyatı netleştirin ve ürünleri Trendyol&apos;a göndererek erişimi
                    büyütün.
                  </p>
                </li>
              ) : (
                recentOrdersList.map((o) => {
                  const badge = adminOrderListBadge(o);
                  return (
                    <li
                      key={o.id}
                      className="group flex flex-wrap items-center gap-2 rounded-lg border border-stone-200/70 bg-stone-50/35 px-3 py-2 transition-all duration-200 hover:-translate-y-px hover:border-stone-300/75 hover:bg-stone-100/65 hover:shadow-[0_6px_20px_-8px_rgba(28,25,23,0.09)] hover:ring-1 hover:ring-stone-300/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[11px] font-semibold text-stone-950" title={o.order_number}>
                          {shortenOrderNumberDisplay(o.order_number)}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                          <span className="text-[11px] font-medium text-stone-700">{o.customer_name}</span>
                          <span className="text-[10px] font-semibold tabular-nums text-stone-400">
                            {formatOrderRelativeTimeTr(o.created_at)}
                          </span>
                        </p>
                      </div>
                      <span className={`shrink-0 ${badge.pill}`}>{badge.label}</span>
                      <TryPriceSplit
                        n={Number(o.total ?? 0)}
                        className="shrink-0 text-xs font-bold tabular-nums text-stone-900"
                      />
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="shrink-0 rounded-md bg-stone-900 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-stone-800 hover:shadow active:scale-[0.98]"
                      >
                        Detay
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </section>
      ) : null}

      {currentTab === "products" ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-base font-medium text-stone-900">Ürünler</h2>
          <p className="mt-1 text-sm text-stone-500">Ürün yönetimi için aşağıdaki sayfayı kullan.</p>
          <Link href="/admin/products" className="mt-4 inline-flex rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50">
            Ürün listesi
          </Link>
        </section>
      ) : null}

      {currentTab === "settings" ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-base font-medium text-stone-900">Ayarlar</h2>
            <p className="mt-1 text-sm text-stone-500">
              Panel yönetimi ve entegrasyon işlemlerini buradan hızlıca yönetebilirsin.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500">Entegrasyon</p>
              <p className="mt-2 text-sm text-stone-700">
                Trendyol bağlantı ayarlarını, test ve senkron ekranını aç.
              </p>
              <Link
                href="/admin/trendyol"
                className="mt-3 inline-flex rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50"
              >
                Trendyol ayarlarını aç
              </Link>
            </article>

            <article className="rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500">Katalog</p>
              <p className="mt-2 text-sm text-stone-700">
                Ürün, stok ve içerik yönetimi için ürün listesine geç.
              </p>
              <Link
                href="/admin/products"
                className="mt-3 inline-flex rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50"
              >
                Ürün yönetimini aç
              </Link>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-stone-900">Kategori görselleri (Ana sayfa)</h3>
              <p className="mt-1 text-xs text-stone-500">Slug eşleşen kartlarda bu görseller kullanılır.</p>
              <div className="mt-4 space-y-3">
                {categories.map((c) => (
                  <form key={`cat-${c.id}`} action={saveCategory} className="rounded-xl border border-stone-200/80 bg-stone-50/40 p-3">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="name" value={c.name} />
                    <input type="hidden" name="slug" value={c.slug} />
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-stone-900">{c.name}</p>
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-700">{c.slug}</span>
                    </div>
                    <input
                      name="image_url"
                      defaultValue={String((c as { image_url?: string | null }).image_url ?? "")}
                      placeholder="https://... kategori görsel URL"
                      className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs text-stone-800"
                    />
                    <div className="mt-2 flex justify-end">
                      <button type="submit" className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800">
                        Kaydet
                      </button>
                    </div>
                  </form>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-stone-900">Koleksiyon görselleri (Ana sayfa)</h3>
              <p className="mt-1 text-xs text-stone-500">Koleksiyon kartları bu URL alanını kullanır.</p>
              <div className="mt-4 space-y-3">
                {collections.map((c) => (
                  <form key={`col-${c.id}`} action={saveCollection} className="rounded-xl border border-stone-200/80 bg-stone-50/40 p-3">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="name" value={c.name} />
                    <input type="hidden" name="slug" value={c.slug} />
                    <input type="hidden" name="description" value={String((c as { description?: string | null }).description ?? "")} />
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-stone-900">{c.name}</p>
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-700">{c.slug}</span>
                    </div>
                    <input
                      name="image_url"
                      defaultValue={String((c as { image_url?: string | null }).image_url ?? "")}
                      placeholder="https://... koleksiyon görsel URL"
                      className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs text-stone-800"
                    />
                    <div className="mt-2 flex justify-end">
                      <button type="submit" className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800">
                        Kaydet
                      </button>
                    </div>
                  </form>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
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
}: {
  title: string;
  value?: string;
  valueNode?: ReactNode;
  trend?: ReactNode;
  helper?: ReactNode;
  className?: string;
  valueClassName?: string;
  emphasis?: boolean;
}) {
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
/*
import Link from "next/link";
import { redirect } from "next/navigation";
import { saveCategory, saveCollection, signOutAdmin } from "@/app/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AdminTab = "analytics" | "products" | "trendyol" | "settings";

function tabLabel(tab: AdminTab) {
  if (tab === "analytics") return "Analytics";
  if (tab === "products") return "Products";
  if (tab === "trendyol") return "Trendyol";
  return "Settings";
}

function toTry(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = (sp.tab ?? "analytics") as AdminTab;
  const currentTab: AdminTab = ["analytics", "products", "trendyol", "settings"].includes(tab) ? tab : "analytics";

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

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);
  const dayStartIso = dayStart.toISOString();
  const dayEndIso = dayEnd.toISOString();

  const [todayOrdersRes, todayAnalyticsRes, productsRes, todayOrderItemsRes, trendyolCountsRes] = await Promise.all([
    admin
      .from("orders")
      .select("id,total,payment_status,order_status,created_at,order_number,customer_name")
      .gte("created_at", dayStartIso)
      .lte("created_at", dayEndIso)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("analytics_events")
      .select("event_name,occurred_at,ecommerce")
      .gte("occurred_at", dayStartIso)
      .lte("occurred_at", dayEndIso)
      .order("occurred_at", { ascending: false })
      .limit(4000),
    admin
      .from("products")
      .select("id,name,stock_quantity,is_active,trendyol_active,trendyol_barcode,trendyol_stock_code,trendyol_category_id")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("order_items")
      .select("product_id,quantity,order:orders!inner(created_at,payment_status,order_status),product:products(name)")
      .gte("order.created_at", dayStartIso)
      .lte("order.created_at", dayEndIso)
      .eq("order.payment_status", "paid")
      .neq("order.order_status", "cancelled")
      .limit(2000),
    admin
      .from("products")
      .select("id,trendyol_active,trendyol_barcode,trendyol_stock_code,trendyol_category_id")
      .limit(500),
  ]);

  const todayOrders = todayOrdersRes.data ?? [];
  const todayAnalytics = todayAnalyticsRes.data ?? [];
  const products = productsRes.data ?? [];
  const todayOrderItems = todayOrderItemsRes.data ?? [];
  const trendyolRows = trendyolCountsRes.data ?? [];

  const ordersToday = todayOrders.length;
  const revenueToday = todayOrders
    .filter((o) => o.payment_status === "paid" && o.order_status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const addToCartToday = todayAnalytics.filter((e) => e.event_name === "add_to_cart").length;
  const viewItemToday = todayAnalytics.filter((e) => e.event_name === "view_item").length;
  const purchaseToday = todayAnalytics.filter((e) => e.event_name === "purchase").length;
  const conversionRate = viewItemToday > 0 ? ((purchaseToday / viewItemToday) * 100).toFixed(1) : "0.0";

  const lowStockProducts = products.filter(
    (p) => Boolean(p.is_active) && Number(p.stock_quantity ?? 0) > 0 && Number(p.stock_quantity ?? 0) <= 3,
  );

  const missingMarketplaceProducts = products.filter((p) => {
    if (!Boolean(p.trendyol_active)) return false;
    return [
      String(p.trendyol_barcode ?? "").trim(),
      String(p.trendyol_stock_code ?? "").trim(),
      String(p.trendyol_category_id ?? "").trim(),
    ].some((v) => !v);
  });

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

  const trendyolActiveCount = trendyolRows.filter((p) => Boolean(p.trendyol_active)).length;
  const trendyolMissingCount = trendyolRows.filter((p) => {
    if (!Boolean(p.trendyol_active)) return false;
    return [
      String(p.trendyol_barcode ?? "").trim(),
      String(p.trendyol_stock_code ?? "").trim(),
      String(p.trendyol_category_id ?? "").trim(),
    ].some((v) => !v);
  }).length;

  const recentOrders = todayOrders.slice(0, 8);
  const recentProducts = products.slice(0, 8);

  return (
    <main className="container-premium py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-stone-900">Zelula Admin</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Ürünler
          </Link>
          <form action={signOutAdmin}>
            <button className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
              Çıkış Yap
            </button>
          </form>
        </div>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Admin tabs">
        {(["analytics", "products", "trendyol", "settings"] as AdminTab[]).map((t) => (
          <Link
            key={t}
            href={`/admin?tab=${t}`}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              currentTab === t
                ? "border-[#c6a15b]/60 bg-[#faf4ea] text-stone-900"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
            }`}
          >
            {tabLabel(t)}
          </Link>
        ))}
      </nav>

      {currentTab === "analytics" ? (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Orders today" value={ordersToday.toLocaleString("tr-TR")} />
            <StatCard title="Revenue today" value={toTry(revenueToday)} accent />
            <StatCard title="Add to cart" value={addToCartToday.toLocaleString("tr-TR")} />
            <StatCard title="Conversion rate" value={`${conversionRate}%`} />
          </div>

          <section className="rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-5 shadow-[0_8px_24px_rgba(62,52,38,0.04)]">
            <h2 className="text-base font-medium text-stone-900">Today&apos;s actions</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ActionCard
                title="Low stock products"
                value={`${lowStockProducts.length} ürün`}
                detail={
                  lowStockProducts.slice(0, 3).map((p) => `${p.name} (stok ${p.stock_quantity})`).join(" • ") ||
                  "Aksiyon gerekmiyor"
                }
              />
              <ActionCard
                title="Missing marketplace products"
                value={`${missingMarketplaceProducts.length} ürün`}
                detail={
                  missingMarketplaceProducts.slice(0, 3).map((p) => p.name).join(" • ") || "Tümü hazır görünüyor"
                }
              />
              <ActionCard
                title="Top selling product"
                value={topSellingProduct ? `${topSellingProduct.qty} adet` : "Veri yok"}
                detail={topSellingProduct?.name ?? "Bugün henüz satış görünmüyor"}
              />
              <ActionCard
                title="Trendyol readiness"
                value={`${Math.max(trendyolActiveCount - trendyolMissingCount, 0)} hazır`}
                detail={`${trendyolMissingCount} üründe eksik alan var`}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-medium text-stone-900">Recent orders (today)</h2>
              <Link href="/admin?tab=analytics" className="text-xs text-stone-500 hover:text-stone-800">
                Tümünü aç
              </Link>
            </div>
            <ul className="space-y-2">
              {recentOrders.length === 0 ? (
                <li className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">
                  Bugün henüz sipariş yok.
                </li>
              ) : (
                recentOrders.map((o) => (
                  <li key={o.id} className="rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-stone-900">{o.order_number}</span>
                      <span className="text-xs text-stone-500">
                        {o.payment_status} / {o.order_status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {o.customer_name} • {toTry(Number(o.total ?? 0))}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </section>
      ) : null}

      {currentTab === "products" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-base font-medium text-stone-900">Products</h2>
            <p className="mt-1 text-sm text-stone-500">Ürün yönetimini hızlıca aç.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/admin/products" className="rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50">
                Tüm ürünler
              </Link>
              <Link href="/admin/products/new" className="rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50">
                Yeni ürün
              </Link>
            </div>
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-base font-medium text-stone-900">Recent products</h2>
            <ul className="mt-4 space-y-2">
              {recentProducts.map((p) => (
                <li key={p.id} className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{p.name}</span>
                    <Link href={`/admin/products/${p.id}/edit`} className="text-xs text-stone-500 hover:text-stone-800">
                      Düzenle
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </section>
      ) : null}

      {currentTab === "trendyol" ? (
        <section className="rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-6 shadow-[0_8px_24px_rgba(62,52,38,0.04)]">
          <h2 className="text-base font-medium text-stone-900">Trendyol</h2>
          <p className="mt-1 text-sm text-stone-500">Entegrasyon ve hazır ürün kontrolleri ayrı sayfaya taşındı.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ActionCard
              title="Aktif ürün"
              value={trendyolActiveCount.toLocaleString("tr-TR")}
              detail="Trendyol aktif olarak işaretli ürünler"
            />
            <ActionCard
              title="Eksik alan"
              value={trendyolMissingCount.toLocaleString("tr-TR")}
              detail="Barkod, stok kodu veya kategori bilgisi eksik"
            />
          </div>
          <Link
            href="/admin/trendyol"
            className="mt-5 inline-flex rounded-lg border border-[#d8c9b1] bg-white px-4 py-2 text-sm text-stone-800 hover:border-[#c6a15b]/60"
          >
            /admin/trendyol sayfasını aç
          </Link>
        </section>
      ) : null}

      {currentTab === "settings" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <form action={saveCategory} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-base font-medium text-stone-900">Kategori yönetimi</h2>
            <input name="id" placeholder="id (opsiyonel)" className="w-full rounded-lg border p-2 text-sm" />
            <input name="name" placeholder="Kategori adı" required className="w-full rounded-lg border p-2 text-sm" />
            <input name="slug" placeholder="slug" required className="w-full rounded-lg border p-2 text-sm" />
            <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Kaydet</button>
          </form>

          <form action={saveCollection} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-base font-medium text-stone-900">Koleksiyon yönetimi</h2>
            <input name="id" placeholder="id (opsiyonel)" className="w-full rounded-lg border p-2 text-sm" />
            <input name="name" placeholder="Koleksiyon adı" required className="w-full rounded-lg border p-2 text-sm" />
            <input name="slug" placeholder="slug" required className="w-full rounded-lg border p-2 text-sm" />
            <input name="description" placeholder="Açıklama" className="w-full rounded-lg border p-2 text-sm" />
            <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Kaydet</button>
          </form>
        </section>
      ) : null}
    </main>
  );
}

function StatCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-4 shadow-[0_6px_16px_rgba(62,52,38,0.04)]">
      <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500">{title}</p>
      <p className={`mt-2 font-serif text-2xl ${accent ? "text-[#8a6a3d]" : "text-stone-900"}`}>{value}</p>
    </article>
  );
}

function ActionCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white/85 p-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">{title}</p>
      <p className="mt-1 text-lg font-semibold text-stone-900">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">{detail}</p>
    </article>
  );
}
import Link from "next/link";
import { redirect } from "next/navigation";
import { saveCategory, saveCollection, signOutAdmin } from "@/app/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AdminTab = "analytics" | "products" | "trendyol" | "settings";

function tabLabel(tab: AdminTab) {
  if (tab === "analytics") return "Analytics";
  if (tab === "products") return "Products";
  if (tab === "trendyol") return "Trendyol";
  return "Settings";
}

function toTry(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = (sp.tab ?? "analytics") as AdminTab;
  const currentTab: AdminTab = ["analytics", "products", "trendyol", "settings"].includes(tab) ? tab : "analytics";

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

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);
  const dayStartIso = dayStart.toISOString();
  const dayEndIso = dayEnd.toISOString();

  const [todayOrdersRes, todayAnalyticsRes, productsRes, todayOrderItemsRes, trendyolCountsRes] = await Promise.all([
    admin
      .from("orders")
      .select("id,total,payment_status,order_status,created_at,order_number,customer_name")
      .gte("created_at", dayStartIso)
      .lte("created_at", dayEndIso)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("analytics_events")
      .select("event_name,occurred_at,ecommerce")
      .gte("occurred_at", dayStartIso)
      .lte("occurred_at", dayEndIso)
      .order("occurred_at", { ascending: false })
      .limit(4000),
    admin
      .from("products")
      .select("id,name,stock_quantity,is_active,trendyol_active,trendyol_barcode,trendyol_stock_code,trendyol_category_id")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("order_items")
      .select("product_id,quantity,order:orders!inner(created_at,payment_status,order_status),product:products(name)")
      .gte("order.created_at", dayStartIso)
      .lte("order.created_at", dayEndIso)
      .eq("order.payment_status", "paid")
      .neq("order.order_status", "cancelled")
      .limit(2000),
    admin
      .from("products")
      .select("id,trendyol_active,trendyol_barcode,trendyol_stock_code,trendyol_category_id")
      .limit(500),
  ]);

  const todayOrders = todayOrdersRes.data ?? [];
  const todayAnalytics = todayAnalyticsRes.data ?? [];
  const products = productsRes.data ?? [];
  const todayOrderItems = todayOrderItemsRes.data ?? [];
  const trendyolRows = trendyolCountsRes.data ?? [];

  const ordersToday = todayOrders.length;
  const revenueToday = todayOrders
    .filter((o) => o.payment_status === "paid" && o.order_status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const addToCartToday = todayAnalytics.filter((e) => e.event_name === "add_to_cart").length;
  const viewItemToday = todayAnalytics.filter((e) => e.event_name === "view_item").length;
  const purchaseToday = todayAnalytics.filter((e) => e.event_name === "purchase").length;
  const conversionRate = viewItemToday > 0 ? ((purchaseToday / viewItemToday) * 100).toFixed(1) : "0.0";

  const lowStockProducts = products.filter(
    (p) => Boolean(p.is_active) && Number(p.stock_quantity ?? 0) > 0 && Number(p.stock_quantity ?? 0) <= 3,
  );

  const missingMarketplaceProducts = products.filter((p) => {
    if (!Boolean(p.trendyol_active)) return false;
    const missing = [
      String(p.trendyol_barcode ?? "").trim(),
      String(p.trendyol_stock_code ?? "").trim(),
      String(p.trendyol_category_id ?? "").trim(),
    ].some((v) => !v);
    return missing;
  });

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

  const trendyolActiveCount = trendyolRows.filter((p) => Boolean(p.trendyol_active)).length;
  const trendyolMissingCount = trendyolRows.filter((p) => {
    if (!Boolean(p.trendyol_active)) return false;
    return [
      String(p.trendyol_barcode ?? "").trim(),
      String(p.trendyol_stock_code ?? "").trim(),
      String(p.trendyol_category_id ?? "").trim(),
    ].some((v) => !v);
  }).length;

  const recentOrders = todayOrders.slice(0, 8);
  const recentProducts = products.slice(0, 8);

  return (
    <main className="container-premium py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-stone-900">Zelula Admin</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Ürünler
          </Link>
          <form action={signOutAdmin}>
            <button className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
              Çıkış Yap
            </button>
          </form>
        </div>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Admin tabs">
        {(["analytics", "products", "trendyol", "settings"] as AdminTab[]).map((t) => (
          <Link
            key={t}
            href={`/admin?tab=${t}`}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              currentTab === t
                ? "border-[#c6a15b]/60 bg-[#faf4ea] text-stone-900"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
            }`}
          >
            {tabLabel(t)}
          </Link>
        ))}
      </nav>

      {currentTab === "analytics" ? (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Orders today" value={ordersToday.toLocaleString("tr-TR")} />
            <StatCard title="Revenue today" value={toTry(revenueToday)} accent />
            <StatCard title="Add to cart" value={addToCartToday.toLocaleString("tr-TR")} />
            <StatCard title="Conversion rate" value={`${conversionRate}%`} />
          </div>

          <section className="rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-5 shadow-[0_8px_24px_rgba(62,52,38,0.04)]">
            <h2 className="text-base font-medium text-stone-900">Today&apos;s actions</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ActionCard
                title="Low stock products"
                value={`${lowStockProducts.length} ürün`}
                detail={
                  lowStockProducts.slice(0, 3).map((p) => `${p.name} (stok ${p.stock_quantity})`).join(" • ") ||
                  "Aksiyon gerekmiyor"
                }
              />
              <ActionCard
                title="Missing marketplace products"
                value={`${missingMarketplaceProducts.length} ürün`}
                detail={
                  missingMarketplaceProducts.slice(0, 3).map((p) => p.name).join(" • ") || "Tümü hazır görünüyor"
                }
              />
              <ActionCard
                title="Top selling product"
                value={topSellingProduct ? `${topSellingProduct.qty} adet` : "Veri yok"}
                detail={topSellingProduct?.name ?? "Bugün henüz satış görünmüyor"}
              />
              <ActionCard
                title="Trendyol readiness"
                value={`${Math.max(trendyolActiveCount - trendyolMissingCount, 0)} hazır`}
                detail={`${trendyolMissingCount} üründe eksik alan var`}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-medium text-stone-900">Recent orders (today)</h2>
              <Link href="/admin?tab=analytics" className="text-xs text-stone-500 hover:text-stone-800">
                Tümünü aç
              </Link>
            </div>
            <ul className="space-y-2">
              {recentOrders.length === 0 ? (
                <li className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">
                  Bugün henüz sipariş yok.
                </li>
              ) : (
                recentOrders.map((o) => (
                  <li key={o.id} className="rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-stone-900">{o.order_number}</span>
                      <span className="text-xs text-stone-500">
                        {o.payment_status} / {o.order_status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {o.customer_name} • {toTry(Number(o.total ?? 0))}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </section>
      ) : null}

      {currentTab === "products" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-base font-medium text-stone-900">Products</h2>
            <p className="mt-1 text-sm text-stone-500">Ürün yönetimini hızlıca aç.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/admin/products" className="rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50">
                Tüm ürünler
              </Link>
              <Link href="/admin/products/new" className="rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50">
                Yeni ürün
              </Link>
            </div>
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-base font-medium text-stone-900">Recent products</h2>
            <ul className="mt-4 space-y-2">
              {recentProducts.map((p) => (
                <li key={p.id} className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{p.name}</span>
                    <Link href={`/admin/products/${p.id}/edit`} className="text-xs text-stone-500 hover:text-stone-800">
                      Düzenle
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </section>
      ) : null}

      {currentTab === "trendyol" ? (
        <section className="rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-6 shadow-[0_8px_24px_rgba(62,52,38,0.04)]">
          <h2 className="text-base font-medium text-stone-900">Trendyol</h2>
          <p className="mt-1 text-sm text-stone-500">Entegrasyon ve hazır ürün kontrolleri ayrı sayfaya taşındı.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ActionCard
              title="Aktif ürün"
              value={trendyolActiveCount.toLocaleString("tr-TR")}
              detail="Trendyol aktif olarak işaretli ürünler"
            />
            <ActionCard
              title="Eksik alan"
              value={trendyolMissingCount.toLocaleString("tr-TR")}
              detail="Barkod, stok kodu veya kategori bilgisi eksik"
            />
          </div>
          <Link
            href="/admin/trendyol"
            className="mt-5 inline-flex rounded-lg border border-[#d8c9b1] bg-white px-4 py-2 text-sm text-stone-800 hover:border-[#c6a15b]/60"
          >
            /admin/trendyol sayfasını aç
          </Link>
        </section>
      ) : null}

      {currentTab === "settings" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <form action={saveCategory} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-base font-medium text-stone-900">Kategori yönetimi</h2>
            <input name="id" placeholder="id (opsiyonel)" className="w-full rounded-lg border p-2 text-sm" />
            <input name="name" placeholder="Kategori adı" required className="w-full rounded-lg border p-2 text-sm" />
            <input name="slug" placeholder="slug" required className="w-full rounded-lg border p-2 text-sm" />
            <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Kaydet</button>
          </form>

          <form action={saveCollection} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-base font-medium text-stone-900">Koleksiyon yönetimi</h2>
            <input name="id" placeholder="id (opsiyonel)" className="w-full rounded-lg border p-2 text-sm" />
            <input name="name" placeholder="Koleksiyon adı" required className="w-full rounded-lg border p-2 text-sm" />
            <input name="slug" placeholder="slug" required className="w-full rounded-lg border p-2 text-sm" />
            <input name="description" placeholder="Açıklama" className="w-full rounded-lg border p-2 text-sm" />
            <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Kaydet</button>
          </form>
        </section>
      ) : null}
    </main>
  );
}

function StatCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-4 shadow-[0_6px_16px_rgba(62,52,38,0.04)]">
      <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500">{title}</p>
      <p className={`mt-2 font-serif text-2xl ${accent ? "text-[#8a6a3d]" : "text-stone-900"}`}>{value}</p>
    </article>
  );
}

function ActionCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white/85 p-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">{title}</p>
      <p className="mt-1 text-lg font-semibold text-stone-900">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">{detail}</p>
    </article>
  );
}
import Link from "next/link";
import { redirect } from "next/navigation";
import { saveCategory, saveCollection, signOutAdmin } from "@/app/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AdminTab = "analytics" | "products" | "trendyol" | "settings";

function tabLabel(tab: AdminTab) {
  if (tab === "analytics") return "Analytics";
  if (tab === "products") return "Products";
  if (tab === "trendyol") return "Trendyol";
  return "Settings";
}

function toTry(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = (sp.tab ?? "analytics") as AdminTab;
  const currentTab: AdminTab = ["analytics", "products", "trendyol", "settings"].includes(tab) ? tab : "analytics";

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

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);
  const dayStartIso = dayStart.toISOString();
  const dayEndIso = dayEnd.toISOString();

  const [todayOrdersRes, todayAnalyticsRes, productsRes, todayOrderItemsRes, trendyolCountsRes] = await Promise.all([
    admin
      .from("orders")
      .select("id,total,payment_status,order_status,created_at,order_number,customer_name")
      .gte("created_at", dayStartIso)
      .lte("created_at", dayEndIso)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("analytics_events")
      .select("event_name,occurred_at,ecommerce")
      .gte("occurred_at", dayStartIso)
      .lte("occurred_at", dayEndIso)
      .order("occurred_at", { ascending: false })
      .limit(4000),
    admin
      .from("products")
      .select("id,name,stock_quantity,is_active,trendyol_active,trendyol_barcode,trendyol_stock_code,trendyol_category_id")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("order_items")
      .select("product_id,quantity,order:orders!inner(created_at,payment_status,order_status),product:products(name)")
      .gte("order.created_at", dayStartIso)
      .lte("order.created_at", dayEndIso)
      .eq("order.payment_status", "paid")
      .neq("order.order_status", "cancelled")
      .limit(2000),
    admin
      .from("products")
      .select("id,trendyol_active,trendyol_barcode,trendyol_stock_code,trendyol_category_id")
      .limit(500),
  ]);

  const todayOrders = todayOrdersRes.data ?? [];
  const todayAnalytics = todayAnalyticsRes.data ?? [];
  const products = productsRes.data ?? [];
  const todayOrderItems = todayOrderItemsRes.data ?? [];
  const trendyolRows = trendyolCountsRes.data ?? [];

  const ordersToday = todayOrders.length;
  const revenueToday = todayOrders
    .filter((o) => o.payment_status === "paid" && o.order_status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const addToCartToday = todayAnalytics.filter((e) => e.event_name === "add_to_cart").length;
  const viewItemToday = todayAnalytics.filter((e) => e.event_name === "view_item").length;
  const purchaseToday = todayAnalytics.filter((e) => e.event_name === "purchase").length;
  const conversionRate = viewItemToday > 0 ? ((purchaseToday / viewItemToday) * 100).toFixed(1) : "0.0";

  const lowStockProducts = products.filter((p) => Boolean(p.is_active) && Number(p.stock_quantity ?? 0) > 0 && Number(p.stock_quantity ?? 0) <= 3);

  const missingMarketplaceProducts = products.filter((p) => {
    if (!Boolean(p.trendyol_active)) return false;
    const missing = [
      String(p.trendyol_barcode ?? "").trim(),
      String(p.trendyol_stock_code ?? "").trim(),
      String(p.trendyol_category_id ?? "").trim(),
    ].some((v) => !v);
    return missing;
  });

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

  const trendyolActiveCount = trendyolRows.filter((p) => Boolean(p.trendyol_active)).length;
  const trendyolMissingCount = trendyolRows.filter((p) => {
    if (!Boolean(p.trendyol_active)) return false;
    return [
      String(p.trendyol_barcode ?? "").trim(),
      String(p.trendyol_stock_code ?? "").trim(),
      String(p.trendyol_category_id ?? "").trim(),
    ].some((v) => !v);
  }).length;

  const recentOrders = todayOrders.slice(0, 8);
  const recentProducts = products.slice(0, 8);

  return (
    <main className="container-premium py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-stone-900">Zelula Admin</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Ürünler
          </Link>
          <form action={signOutAdmin}>
            <button className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
              Çıkış Yap
            </button>
          </form>
        </div>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Admin tabs">
        {(["analytics", "products", "trendyol", "settings"] as AdminTab[]).map((t) => (
          <Link
            key={t}
            href={`/admin?tab=${t}`}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              currentTab === t
                ? "border-[#c6a15b]/60 bg-[#faf4ea] text-stone-900"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
            }`}
          >
            {tabLabel(t)}
          </Link>
        ))}
      </nav>

      {currentTab === "analytics" ? (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Orders today" value={ordersToday.toLocaleString("tr-TR")} />
            <StatCard title="Revenue today" value={toTry(revenueToday)} accent />
            <StatCard title="Add to cart" value={addToCartToday.toLocaleString("tr-TR")} />
            <StatCard title="Conversion rate" value={`${conversionRate}%`} />
          </div>

          <section className="rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-5 shadow-[0_8px_24px_rgba(62,52,38,0.04)]">
            <h2 className="text-base font-medium text-stone-900">Today&apos;s actions</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ActionCard
                title="Low stock products"
                value={`${lowStockProducts.length} ürün`}
                detail={lowStockProducts.slice(0, 3).map((p) => `${p.name} (stok ${p.stock_quantity})`).join(" • ") || "Aksiyon gerekmiyor"}
              />
              <ActionCard
                title="Missing marketplace products"
                value={`${missingMarketplaceProducts.length} ürün`}
                detail={missingMarketplaceProducts.slice(0, 3).map((p) => p.name).join(" • ") || "Tümü hazır görünüyor"}
              />
              <ActionCard
                title="Top selling product"
                value={topSellingProduct ? `${topSellingProduct.qty} adet` : "Veri yok"}
                detail={topSellingProduct?.name ?? "Bugün henüz satış görünmüyor"}
              />
              <ActionCard
                title="Trendyol readiness"
                value={`${Math.max(trendyolActiveCount - trendyolMissingCount, 0)} hazır`}
                detail={`${trendyolMissingCount} üründe eksik alan var`}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-medium text-stone-900">Recent orders (today)</h2>
              <Link href="/admin?tab=analytics" className="text-xs text-stone-500 hover:text-stone-800">
                Tümünü aç
              </Link>
            </div>
            <ul className="space-y-2">
              {recentOrders.length === 0 ? (
                <li className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">
                  Bugün henüz sipariş yok.
                </li>
              ) : (
                recentOrders.map((o) => (
                  <li key={o.id} className="rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-stone-900">{o.order_number}</span>
                      <span className="text-xs text-stone-500">
                        {o.payment_status} / {o.order_status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {o.customer_name} • {toTry(Number(o.total ?? 0))}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </section>
      ) : null}

      {currentTab === "products" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-base font-medium text-stone-900">Products</h2>
            <p className="mt-1 text-sm text-stone-500">Ürün yönetimini hızlıca aç.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/admin/products" className="rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50">
                Tüm ürünler
              </Link>
              <Link href="/admin/products/new" className="rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50">
                Yeni ürün
              </Link>
            </div>
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-base font-medium text-stone-900">Recent products</h2>
            <ul className="mt-4 space-y-2">
              {recentProducts.map((p) => (
                <li key={p.id} className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{p.name}</span>
                    <Link href={`/admin/products/${p.id}/edit`} className="text-xs text-stone-500 hover:text-stone-800">
                      Düzenle
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </section>
      ) : null}

      {currentTab === "trendyol" ? (
        <section className="rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-6 shadow-[0_8px_24px_rgba(62,52,38,0.04)]">
          <h2 className="text-base font-medium text-stone-900">Trendyol</h2>
          <p className="mt-1 text-sm text-stone-500">
            Entegrasyon ve hazır ürün kontrolleri ayrı sayfaya taşındı.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ActionCard title="Aktif ürün" value={trendyolActiveCount.toLocaleString("tr-TR")} detail="Trendyol aktif olarak işaretli ürünler" />
            <ActionCard title="Eksik alan" value={trendyolMissingCount.toLocaleString("tr-TR")} detail="Barkod, stok kodu veya kategori bilgisi eksik" />
          </div>
          <Link
            href="/admin/trendyol"
            className="mt-5 inline-flex rounded-lg border border-[#d8c9b1] bg-white px-4 py-2 text-sm text-stone-800 hover:border-[#c6a15b]/60"
          >
            /admin/trendyol sayfasını aç
          </Link>
        </section>
      ) : null}

      {currentTab === "settings" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <form action={saveCategory} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-base font-medium text-stone-900">Kategori yönetimi</h2>
            <input name="id" placeholder="id (opsiyonel)" className="w-full rounded-lg border p-2 text-sm" />
            <input name="name" placeholder="Kategori adı" required className="w-full rounded-lg border p-2 text-sm" />
            <input name="slug" placeholder="slug" required className="w-full rounded-lg border p-2 text-sm" />
            <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Kaydet</button>
          </form>

          <form action={saveCollection} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-base font-medium text-stone-900">Koleksiyon yönetimi</h2>
            <input name="id" placeholder="id (opsiyonel)" className="w-full rounded-lg border p-2 text-sm" />
            <input name="name" placeholder="Koleksiyon adı" required className="w-full rounded-lg border p-2 text-sm" />
            <input name="slug" placeholder="slug" required className="w-full rounded-lg border p-2 text-sm" />
            <input name="description" placeholder="Açıklama" className="w-full rounded-lg border p-2 text-sm" />
            <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Kaydet</button>
          </form>
        </section>
      ) : null}
    </main>
  );
}

function StatCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-4 shadow-[0_6px_16px_rgba(62,52,38,0.04)]">
      <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500">{title}</p>
      <p className={`mt-2 font-serif text-2xl ${accent ? "text-[#8a6a3d]" : "text-stone-900"}`}>{value}</p>
    </article>
  );
}

function ActionCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white/85 p-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">{title}</p>
      <p className="mt-1 text-lg font-semibold text-stone-900">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">{detail}</p>
    </article>
  );
}
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  checkTrendyolBatchStatusAction,
  fetchTrendyolOrdersAction,
  importTrendyolApprovedProductsAction,
  reconcileOrderStatus,
  retryPaymentInit,
  saveCategory,
  saveCollection,
  saveTrendyolIntegrationSettings,
  signOutAdmin,
  syncReadyTrendyolProductsAction,
  syncTrendyolPriceInventoryBatch,
  syncTrendyolPriceInventoryNow,
  syncTrendyolProductNow,
  markOrderPaidManually,
  refreshTrendyolCategoryAttributesAction,
  uploadProductImage,
  updateOrderStatus,
} from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildCategoryReadinessFromCache,
  isCategoryCacheFresh,
} from "@/lib/marketplaces/trendyol/categories";
import { evaluateTrendyolReadiness } from "@/lib/marketplaces/trendyol/readiness";
import type { TrendyolBatchParsedItem } from "@/lib/marketplaces/trendyol/batch-errors";
import {
  buildTrendyolIdentifierToProductIdMapFromIdentifiers,
  resolveProductIdForTrendyolIdentifiers,
} from "@/lib/marketplaces/trendyol/product-lookup";
import { AdminOrdersOverview } from "@/components/admin/dashboard/AdminOrdersOverview";
import { AdminQuickLinks } from "@/components/admin/dashboard/AdminQuickLinks";
import { AdminStatsCards } from "@/components/admin/dashboard/AdminStatsCards";
import { AdminSyncLogsSection } from "@/components/admin/dashboard/AdminSyncLogsSection";
import { AdminTrendyolIntegrationCard } from "@/components/admin/dashboard/AdminTrendyolIntegrationCard";
import { AdminTrendyolReadinessSection } from "@/components/admin/dashboard/AdminTrendyolReadinessSection";

export const dynamic = "force-dynamic";

type TrendyolBatchLogMeta = {
  trendyolBatchParse?: {
    items: TrendyolBatchParsedItem[];
    successfulCount: number;
    failedCount: number;
    unknownCount: number;
    itemsTotal?: number;
    itemsTruncated?: boolean;
    apiStatus?: string | null;
  };
};

function MarketplaceSyncLogEntry({
  log,
  identifierToProductId,
}: {
  log: {
    id: string;
    action: string;
    status: string;
    message: string | null;
    created_at: string;
    response_payload?: unknown;
    metadata?: unknown;
  };
  identifierToProductId: Map<string, string>;
}) {
  const meta = (log.metadata ?? null) as TrendyolBatchLogMeta | null;
  const batch = meta?.trendyolBatchParse;
  const failedItems = batch?.items?.filter((i) => i.outcome === "failed") ?? [];
  const hasPayload = log.response_payload != null;
  const rawJson = hasPayload ? JSON.stringify(log.response_payload, null, 2) : "";

  return (
    <li className="rounded-lg border border-stone-100 bg-white/70 px-3 py-2">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-stone-700">
            <span className="text-stone-500">
              {log.action} · {log.status} ·{" "}
            </span>
            <span className="text-stone-900">{log.message}</span>
          </p>
          {failedItems.length > 0 ? (
            <ul className="mt-1.5 space-y-2 border-l-2 border-amber-300/80 pl-2 text-[11px] text-amber-950">
              {failedItems.slice(0, 6).map((i, idx) => {
                const productId = resolveProductIdForTrendyolIdentifiers(identifierToProductId, i.barcode, i.stockCode);
                const hasCodes = Boolean(i.barcode?.trim() || i.stockCode?.trim());
                const editHref = productId ? `/admin/products/${encodeURIComponent(productId)}/edit` : null;
                return (
                  <li key={`${i.barcode ?? ""}-${i.stockCode ?? ""}-${idx}`}>
                    <p className="font-mono text-[10px] text-stone-700">
                      Barkod: <span className="text-stone-900">{i.barcode?.trim() || "—"}</span>
                      <span className="mx-1.5 text-stone-400">·</span>
                      Stok kodu: <span className="text-stone-900">{i.stockCode?.trim() || "—"}</span>
                    </p>
                    <p className="mt-0.5">
                      <span className="text-stone-400">→</span>{" "}
                      <span className="font-medium">{i.friendlyMessage}</span>
                    </p>
                    {i.rawMessage && i.rawMessage !== i.friendlyMessage ? (
                      <span className="mt-0.5 block text-[10px] font-normal text-stone-500">
                        Kaynak: {i.rawMessage.length > 200 ? `${i.rawMessage.slice(0, 200)}…` : i.rawMessage}
                      </span>
                    ) : null}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {editHref ? (
                        <Link
                          href={editHref}
                          className="inline-flex rounded border border-stone-400 bg-white px-2 py-0.5 text-[10px] font-medium text-stone-800 hover:bg-stone-50"
                        >
                          Ürünü düzenle
                        </Link>
                      ) : hasCodes ? (
                        <span className="text-[10px] font-normal text-stone-400">
                          Bu barkod/stok kodu ile eşleşen ürün bulunamadı.
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
              {failedItems.length > 6 ? (
                <li className="text-[10px] text-stone-500">+{failedItems.length - 6} satır daha…</li>
              ) : null}
              {batch?.itemsTruncated ? (
                <li className="text-[10px] text-stone-500">
                  Logda en fazla {batch.items?.length ?? 0} / {batch.itemsTotal ?? "?"} satır saklandı.
                </li>
              ) : null}
            </ul>
          ) : null}
          {hasPayload ? (
            <details className="mt-1.5 text-[10px] text-stone-500">
              <summary className="cursor-pointer select-none text-stone-600 underline decoration-stone-300 underline-offset-2 hover:text-stone-900">
                Ham API yanıtı
              </summary>
              <pre className="mt-1 max-h-52 overflow-auto rounded border border-stone-200 bg-stone-50 p-2 font-mono text-[10px] leading-relaxed text-stone-800 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100">
                {rawJson}
              </pre>
            </details>
          ) : null}
        </div>
        <span className="shrink-0 text-[11px] text-stone-400 sm:pt-0.5">
          {new Date(String(log.created_at)).toLocaleString("tr-TR")}
        </span>
      </div>
    </li>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    davet?: string;
    ty?: string;
  }>;
}) {
  const sp = await searchParams;
  const davetOnly = sp.davet === "1";
  const trendyolFilter = sp.ty ?? "all";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? "")) redirect("/admin/login");

  const admin = createAdminClient();
  const defaultTo = new Date();
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setDate(defaultFrom.getDate() - 7);
  const from = sp.from ? new Date(sp.from) : defaultFrom;
  const to = sp.to ? new Date(sp.to) : defaultTo;
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const fromParam = fromIso.slice(0, 10);
  const toParam = toIso.slice(0, 10);
  const baseQueryParams = `from=${fromParam}&to=${toParam}`;

  let ordersQuery = admin
    .from("orders")
    .select("*")
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: false })
    .limit(50);
  if (davetOnly) {
    ordersQuery = ordersQuery.or("referrer_user_id.not.is.null,referral_code.not.is.null");
  }

  const [products, ordersRes, referralStatsRes, logs, marketplaceIntegration, marketplaceLogs] = await Promise.all([
    admin.from("products").select("*").order("created_at", { ascending: false }).limit(200),
    ordersQuery,
    admin
      .from("orders")
      .select("id,total,payment_status,order_status,referrer_user_id,referral_code")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .or("referrer_user_id.not.is.null,referral_code.not.is.null")
      .limit(2000),
    admin
      .from("payment_logs")
      .select("*")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(300),
    admin
      .from("marketplace_integrations")
      .select("*")
      .eq("marketplace", "trendyol")
      .maybeSingle(),
    admin
      .from("marketplace_sync_logs")
      .select("*")
      .eq("marketplace", "trendyol")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const orders = ordersRes;
  const syncLogsPreview = (marketplaceLogs.data ?? []).slice(0, 8);
  const trendyolLogLookupKeys: string[] = [];
  for (const row of syncLogsPreview) {
    const meta = (row.metadata ?? null) as TrendyolBatchLogMeta | null;
    for (const item of meta?.trendyolBatchParse?.items ?? []) {
      if (item.outcome !== "failed") continue;
      if (item.barcode?.trim()) trendyolLogLookupKeys.push(item.barcode.trim());
      if (item.stockCode?.trim()) trendyolLogLookupKeys.push(item.stockCode.trim());
    }
  }
  const trendyolLogIdentifierMap = await buildTrendyolIdentifierToProductIdMapFromIdentifiers(
    admin,
    trendyolLogLookupKeys,
  );
  const integrationId = marketplaceIntegration.data?.id as string | undefined;

  const catIdsFromProducts = [
    ...new Set(
      (products.data ?? [])
        .map((p) => String((p as Record<string, unknown>).trendyol_category_id ?? "").trim())
        .filter(Boolean),
    ),
  ];
  let categoryCaches: { category_id: string; payload: unknown; fetched_at: string }[] = [];
  if (integrationId && catIdsFromProducts.length > 0) {
    const { data } = await admin
      .from("marketplace_category_attribute_cache")
      .select("category_id,payload,fetched_at")
      .eq("integration_id", integrationId)
      .in("category_id", catIdsFromProducts);
    categoryCaches = data ?? [];
  }
  const categoryCacheById = new Map(categoryCaches.map((c) => [c.category_id, c]));

  const trendyolRowsRaw = (products.data ?? []).map((p) => {
    const pr = p as Record<string, unknown>;
    const catId = String(pr.trendyol_category_id ?? "").trim();
    const cacheRow = catId ? categoryCacheById.get(catId) : undefined;
    const categoryReadiness = buildCategoryReadinessFromCache(
      cacheRow
        ? {
            category_id: cacheRow.category_id,
            payload: cacheRow.payload,
            fetched_at: String(cacheRow.fetched_at),
          }
        : undefined,
      pr.trendyol_category_attributes,
    );
    const readiness = evaluateTrendyolReadiness(
      {
        is_active: Boolean(p.is_active),
        trendyol_active: Boolean(pr.trendyol_active),
        trendyol_barcode: pr.trendyol_barcode as string | null,
        trendyol_stock_code: pr.trendyol_stock_code as string | null,
        sku: pr.sku as string | null,
        trendyol_brand: pr.trendyol_brand as string | null,
        trendyol_category_id: pr.trendyol_category_id as string | null,
        trendyol_sale_price: Number(pr.trendyol_sale_price ?? p.price ?? 0),
        trendyol_quantity: Number(pr.trendyol_quantity ?? p.stock_quantity ?? 0),
        stock_quantity: Number(p.stock_quantity ?? 0),
        trendyol_vat_rate: Number(pr.trendyol_vat_rate ?? 0),
      },
      categoryReadiness,
    );
    return { product: p, readiness, categoryReadiness, cacheFresh: cacheRow ? isCategoryCacheFresh(String(cacheRow.fetched_at)) : false };
  });
  const trendyolRows = trendyolRowsRaw.filter((r) => {
    if (trendyolFilter === "ready") return r.readiness.status === "ready";
    if (trendyolFilter === "missing") return r.readiness.status === "missing";
    if (trendyolFilter === "disabled") return r.readiness.status === "disabled";
    return true;
  });
  const readyCount = trendyolRowsRaw.filter((r) => r.readiness.status === "ready").length;
  const missingCount = trendyolRowsRaw.filter((r) => r.readiness.status === "missing").length;
  const disabledCount = trendyolRowsRaw.filter((r) => r.readiness.status === "disabled").length;
  const referralOrdersForStats = referralStatsRes.data ?? [];
  const { data: analytics } = await admin
    .from("analytics_events")
    .select("event_name,occurred_at,ecommerce")
    .gte("occurred_at", fromIso)
    .lte("occurred_at", toIso)
    .order("occurred_at", { ascending: false })
    .limit(5000);
  const successfulPayments = (orders.data ?? []).filter((o) => o.payment_status === "paid").length;
  const pendingPayments = (orders.data ?? []).filter((o) => o.payment_status === "pending").length;
  const failedPayments = (orders.data ?? []).filter((o) => o.payment_status === "failed").length;
  const rejectedCallbacks = (logs.data ?? []).filter((l) => l.event_type === "callback_rejected").length;
  const orphanCallbacks = (logs.data ?? []).filter((l) => l.status === "orphaned").length;
  const problematicOrders = (orders.data ?? []).filter(
    (o) => o.payment_status !== "paid" || o.order_status === "cancelled",
  );
  const productViews = (analytics ?? []).filter((e) => e.event_name === "view_item").length;
  const addToCartCount = (analytics ?? []).filter((e) => e.event_name === "add_to_cart").length;
  const beginCheckoutCount = (analytics ?? []).filter((e) => e.event_name === "begin_checkout").length;
  const purchaseCount = (analytics ?? []).filter((e) => e.event_name === "purchase").length;

  const viewToAtc = productViews > 0 ? ((addToCartCount / productViews) * 100).toFixed(1) : "0.0";
  const atcToCheckout =
    addToCartCount > 0 ? ((beginCheckoutCount / addToCartCount) * 100).toFixed(1) : "0.0";
  const checkoutToPurchase =
    beginCheckoutCount > 0 ? ((purchaseCount / beginCheckoutCount) * 100).toFixed(1) : "0.0";

  const byProduct = new Map<
    string,
    { name: string; views: number; atc: number; checkout: number; purchase: number }
  >();
  for (const event of analytics ?? []) {
    const rawItems = ((event.ecommerce as { items?: unknown[] } | null)?.items ?? []) as Array<
      Record<string, unknown>
    >;
    for (const item of rawItems) {
      const id = String(item.item_id ?? "");
      if (!id) continue;
      const name = String(item.item_name ?? "Ürün");
      const row = byProduct.get(id) ?? { name, views: 0, atc: 0, checkout: 0, purchase: 0 };
      if (event.event_name === "view_item") row.views += 1;
      if (event.event_name === "add_to_cart") row.atc += 1;
      if (event.event_name === "begin_checkout") row.checkout += 1;
      if (event.event_name === "purchase") row.purchase += 1;
      byProduct.set(id, row);
    }
  }
  const productRows = Array.from(byProduct.entries()).map(([id, row]) => ({
    id,
    ...row,
    viewToAtc: row.views > 0 ? (row.atc / row.views) * 100 : 0,
    atcToPurchase: row.atc > 0 ? (row.purchase / row.atc) * 100 : 0,
  }));
  const topViewedProducts = [...productRows].sort((a, b) => b.views - a.views).slice(0, 8);
  const topAtcProducts = [...productRows].sort((a, b) => b.atc - a.atc).slice(0, 8);
  const topPurchasedProducts = [...productRows].sort((a, b) => b.purchase - a.purchase).slice(0, 8);
  const highViewLowAtcProducts = [...productRows]
    .filter((p) => p.views >= 5)
    .sort((a, b) => a.viewToAtc - b.viewToAtc)
    .slice(0, 8);
  const highAtcLowPurchaseProducts = [...productRows]
    .filter((p) => p.atc >= 3)
    .sort((a, b) => a.atcToPurchase - b.atcToPurchase)
    .slice(0, 8);

  const referralOrderCount = referralOrdersForStats.length;
  const paidReferralOrders = referralOrdersForStats.filter(
    (o) => o.payment_status === "paid" && String(o.order_status ?? "") !== "cancelled",
  );
  const referralRevenue = paidReferralOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const referralOrderIds = referralOrdersForStats.map((o) => o.id).filter(Boolean);
  let referralPointsAwarded = 0;
  if (referralOrderIds.length > 0) {
    const { data: referralLedger } = await admin
      .from("loyalty_points_ledger")
      .select("points")
      .eq("type", "referral_earned")
      .in("order_id", referralOrderIds);
    referralPointsAwarded = (referralLedger ?? []).reduce((s, row) => s + Number(row.points ?? 0), 0);
  }
  const referrerCounts = new Map<string, number>();
  for (const o of paidReferralOrders) {
    if (o.referrer_user_id) {
      referrerCounts.set(o.referrer_user_id, (referrerCounts.get(o.referrer_user_id) ?? 0) + 1);
    }
  }
  const topReferrerIds = [...referrerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([uid]) => uid);
  const referrerProfiles =
    topReferrerIds.length > 0
      ? (
          await admin.from("profiles").select("id,full_name,referral_code").in("id", topReferrerIds)
        ).data ?? []
      : [];
  const referrerProfileById = new Map(referrerProfiles.map((p) => [p.id, p]));

  return (
    <main className="container-premium py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-3xl">Zelula Admin</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Ürün sayfası
          </Link>
          <form action={signOutAdmin}>
            <button className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm">Çıkış Yap</button>
          </form>
        </div>
      </div>

      <AdminStatsCards
        fromIso={fromIso}
        toIso={toIso}
        davetOnly={davetOnly}
        successfulPayments={successfulPayments}
        pendingPayments={pendingPayments}
        failedPayments={failedPayments}
        rejectedCallbacks={rejectedCallbacks}
        orphanCallbacks={orphanCallbacks}
        problematicOrders={problematicOrders.map((o) => ({
          id: o.id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          payment_status: o.payment_status,
        }))}
      />

      <section className="mb-8 rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-5 shadow-[0_8px_24px_rgba(62,52,38,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium tracking-wide text-stone-800">Zelula Davet Sistemi</h2>
            <p className="mt-1 text-xs font-light text-stone-500">Seçilen tarih aralığında davetle gelen sipariş özeti.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <Link
              href={`/admin?${baseQueryParams}&davet=1`}
              className={`rounded-full border px-3 py-1.5 transition ${davetOnly ? "border-[#c6a15b]/60 bg-[#faf4ea] text-stone-900" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}
            >
              Davetten gelen siparişler
            </Link>
            <Link
              href={`/admin?${baseQueryParams}`}
              className={`rounded-full border px-3 py-1.5 transition ${!davetOnly ? "border-[#c6a15b]/60 bg-[#faf4ea] text-stone-900" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}
            >
              Tüm siparişler
            </Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-stone-200/80 bg-white/80 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">Davet siparişi</p>
            <p className="mt-1 font-serif text-2xl font-light text-stone-900">{referralOrderCount}</p>
          </div>
          <div className="rounded-xl border border-stone-200/80 bg-white/80 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">Davet geliri (ödendi)</p>
            <p className="mt-1 font-serif text-2xl font-light text-[#8a6a3d]">
              {referralRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
            </p>
          </div>
          <div className="rounded-xl border border-stone-200/80 bg-white/80 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">Verilen davet puanı</p>
            <p className="mt-1 font-serif text-2xl font-light text-stone-900">{referralPointsAwarded}</p>
          </div>
        </div>
        {topReferrerIds.length > 0 ? (
          <div className="mt-5 border-t border-stone-200/70 pt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500">Daveti dönüşenler</p>
            <ul className="mt-2 space-y-2 text-xs">
              {topReferrerIds.map((uid) => {
                const prof = referrerProfileById.get(uid);
                const n = referrerCounts.get(uid) ?? 0;
                return (
                  <li key={uid} className="flex items-center justify-between rounded-lg border border-stone-100 bg-white/60 px-3 py-2">
                    <span className="truncate text-stone-700">
                      {prof?.full_name?.trim() || "İsimsiz"}{" "}
                      <span className="text-stone-400">· {prof?.referral_code ?? uid.slice(0, 8)}…</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-stone-600">{n} sipariş</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>

      <AdminTrendyolIntegrationCard
        integration={marketplaceIntegration.data}
        saveTrendyolIntegrationSettings={saveTrendyolIntegrationSettings}
        syncTrendyolPriceInventoryBatch={syncTrendyolPriceInventoryBatch}
        fetchTrendyolOrdersAction={fetchTrendyolOrdersAction}
        importTrendyolApprovedProductsAction={importTrendyolApprovedProductsAction}
        checkTrendyolBatchStatusAction={checkTrendyolBatchStatusAction}
        logs={(
          <AdminSyncLogsSection>
            {syncLogsPreview.map((l) => (
              <MarketplaceSyncLogEntry key={l.id} log={l} identifierToProductId={trendyolLogIdentifierMap} />
            ))}
          </AdminSyncLogsSection>
        )}
      />

      <AdminTrendyolReadinessSection
        baseQueryParams={baseQueryParams}
        trendyolFilter={trendyolFilter}
        trendyolRowsRaw={trendyolRowsRaw}
        trendyolRows={trendyolRows}
        readyCount={readyCount}
        missingCount={missingCount}
        disabledCount={disabledCount}
        syncReadyTrendyolProductsAction={syncReadyTrendyolProductsAction}
        refreshTrendyolCategoryAttributesAction={refreshTrendyolCategoryAttributesAction}
      />

      <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Analytics Funnel</h2>
        {!analytics || analytics.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-600">
            Seçilen tarih aralığında analytics event bulunamadı. Trafik oluşunca funnel raporu burada görünecek.
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Metric title="Product Views" value={productViews} tone="amber" />
          <Metric title="Add To Cart" value={addToCartCount} tone="emerald" />
          <Metric title="Checkout Start" value={beginCheckoutCount} tone="amber" />
          <Metric title="Purchases" value={purchaseCount} tone="emerald" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-xl border border-stone-200 p-3">
            <p className="text-stone-500">View → Add to Cart</p>
            <p className="mt-1 text-2xl font-semibold">{viewToAtc}%</p>
          </div>
          <div className="rounded-xl border border-stone-200 p-3">
            <p className="text-stone-500">Add to Cart → Checkout</p>
            <p className="mt-1 text-2xl font-semibold">{atcToCheckout}%</p>
          </div>
          <div className="rounded-xl border border-stone-200 p-3">
            <p className="text-stone-500">Checkout → Purchase</p>
            <p className="mt-1 text-2xl font-semibold">{checkoutToPurchase}%</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ProductListCard
            title="Top Viewed Products"
            rows={topViewedProducts}
            metric={(p) => `${p.views} view`}
          />
          <ProductListCard
            title="Top Add-to-Cart Products"
            rows={topAtcProducts}
            metric={(p) => `${p.atc} ATC`}
          />
          <ProductListCard
            title="Top Purchased Products"
            rows={topPurchasedProducts}
            metric={(p) => `${p.purchase} purchase`}
          />
          <ProductListCard
            title="High View, Low Add-to-Cart"
            rows={highViewLowAtcProducts}
            metric={(p) => `${p.viewToAtc.toFixed(1)}% V→ATC`}
          />
          <ProductListCard
            title="High Add-to-Cart, Low Purchase"
            rows={highAtcLowPurchaseProducts}
            metric={(p) => `${p.atcToPurchase.toFixed(1)}% ATC→Purchase`}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AdminQuickLinks />

        <div className="space-y-6">
          <form action={saveCategory} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-medium">Kategori Yönetimi</h2>
            <input name="id" placeholder="id (opsiyonel)" className="w-full rounded-lg border p-2" />
            <input name="name" placeholder="Kategori adı" required className="w-full rounded-lg border p-2" />
            <input name="slug" placeholder="slug" required className="w-full rounded-lg border p-2" />
            <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Kaydet</button>
          </form>
          <form action={saveCollection} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-medium">Koleksiyon Yönetimi</h2>
            <input name="id" placeholder="id (opsiyonel)" className="w-full rounded-lg border p-2" />
            <input name="name" placeholder="Koleksiyon adı" required className="w-full rounded-lg border p-2" />
            <input name="slug" placeholder="slug" required className="w-full rounded-lg border p-2" />
            <input name="description" placeholder="Açıklama" className="w-full rounded-lg border p-2" />
            <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Kaydet</button>
          </form>
        </div>
      </section>

      <AdminOrdersOverview
        baseQueryParams={baseQueryParams}
        davetOnly={davetOnly}
        orders={(orders.data ?? []).map((o) => ({
          id: o.id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          total: Number(o.total ?? 0),
          payment_status: o.payment_status,
          order_status: o.order_status,
          referrer_user_id: o.referrer_user_id,
          referral_code: o.referral_code,
        }))}
        updateOrderStatus={updateOrderStatus}
        reconcileOrderStatus={reconcileOrderStatus}
        retryPaymentInit={retryPaymentInit}
        markOrderPaidManually={markOrderPaidManually}
      />

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Görsel Yükleme (Supabase Storage)</h2>
        <form action={uploadProductImage} className="mt-3 grid gap-2 sm:grid-cols-3">
          <input type="hidden" name="return_to" value="/admin" />
          <select name="product_id" className="rounded-lg border p-2 text-sm">
            {products.data?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input type="file" name="image" accept="image/*" className="rounded-lg border p-2 text-sm" />
          <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Yükle</button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Son Ürünler</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {products.data?.map((p) => (
            <li key={p.id} className="flex justify-between border-b py-2">
              <div>
                <p>{p.name}</p>
                <p className="text-xs text-stone-500">{p.price} TRY • stok {p.stock_quantity}</p>
              </div>
              <div className="flex items-center gap-2">
                <form action={syncTrendyolProductNow}>
                  <input type="hidden" name="product_id" value={p.id} />
                  <button className="rounded border border-stone-300 px-2 py-1 text-[11px]">Ürünü sync et</button>
                </form>
                <form action={syncTrendyolPriceInventoryNow}>
                  <input type="hidden" name="product_id" value={p.id} />
                  <button className="rounded border border-stone-300 px-2 py-1 text-[11px]">Fiyat/Stok sync</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Metric({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "emerald" | "amber" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-800 border-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-800 border-amber-100"
        : "bg-rose-50 text-rose-800 border-rose-100";
  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-wide">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ProductListCard({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: Array<{
    id: string;
    name: string;
    views: number;
    atc: number;
    purchase: number;
    viewToAtc: number;
    atcToPurchase: number;
  }>;
  metric: (row: {
    id: string;
    name: string;
    views: number;
    atc: number;
    purchase: number;
    viewToAtc: number;
    atcToPurchase: number;
  }) => string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 rounded border border-dashed border-stone-200 bg-stone-50 px-2 py-3 text-xs text-stone-500">
          Bu aralıkta yeterli veri yok.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-xs">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded border border-stone-100 px-2 py-1.5">
              <span className="truncate pr-2">{p.name}</span>
              <span className="whitespace-nowrap">{metric(p)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
*/
