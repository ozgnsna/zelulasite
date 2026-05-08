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
import { buildDashboardAnalyticsMetrics } from "@/lib/admin/analytics-dashboard";

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

function OrderListTryPrice({ n }: { n: number }) {
  const { main, decimals } = splitTryParts(n);
  return (
    <span className="inline-flex items-baseline gap-0.5 tabular-nums">
      <span className="text-sm font-semibold text-stone-500">₺</span>
      <span className="text-lg font-extrabold tracking-tight text-stone-950">{main}</span>
      <span className="text-xs font-semibold text-stone-400">,{decimals}</span>
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
      pill: "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset bg-rose-50 text-rose-900 ring-rose-600/25",
    };
  }
  if (o.payment_status === "failed") {
    return {
      label,
      pill: "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset bg-rose-50 text-rose-900 ring-rose-600/25",
    };
  }
  if (o.order_status === "shipped") {
    return {
      label,
      pill: "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset bg-sky-50 text-sky-950 ring-sky-700/30",
    };
  }
  if (o.order_status === "processing") {
    return {
      label,
      pill: "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset bg-amber-50 text-amber-950 ring-amber-700/30",
    };
  }
  if (o.payment_status === "paid") {
    return {
      label,
      pill: "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset bg-emerald-50 text-emerald-950 ring-emerald-800/25",
    };
  }
  return {
    label,
    pill: "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset bg-stone-100 text-stone-800 ring-stone-500/20",
  };
}

function paymentStatusBadge(paymentStatus: string): { label: string; pill: string } {
  if (paymentStatus === "paid") {
    return {
      label: "Ödeme alındı",
      pill: "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-700/20",
    };
  }
  if (paymentStatus === "failed") {
    return {
      label: "Ödeme başarısız",
      pill: "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold bg-rose-100 text-rose-900 ring-1 ring-inset ring-rose-700/25",
    };
  }
  return {
    label: "Ödeme bekliyor",
    pill: "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold bg-stone-200/90 text-stone-800 ring-1 ring-inset ring-stone-500/20",
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

/** Canlı şerit için kısa süre gösterimi (örn. "42 sn önce"). */
function formatLiveOrderStripAge(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.floor(Math.max(0, Date.now() - t) / 1000);
  if (sec < 120) return `${Math.max(1, sec)} sn önce`;
  return formatOrderRelativeTimeTr(iso);
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
  const dashboardAnalytics = buildDashboardAnalyticsMetrics(todayAnalytics);
  const addToCartToday = dashboardAnalytics.addToCarts;
  const viewItemToday = dashboardAnalytics.productViews;
  const purchaseToday = dashboardAnalytics.purchases;

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
                  <>Siparişleri onayla / paketle; kargo bilgisini güncel tut. Son liste hemen aşağıda.</>
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

          <section className="rounded-2xl border border-emerald-200/55 bg-gradient-to-b from-white via-white to-emerald-50/35 p-4 shadow-[0_6px_28px_-12px_rgba(16,80,60,0.12)] ring-1 ring-emerald-900/[0.06]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-base font-semibold text-stone-950">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  </span>
                  Son siparişler
                </h2>
                <p className="mt-0.5 text-[11px] font-medium text-stone-600">
                  Canlı kuyruk · son 50 · {dashboardCheckedAtTr}
                </p>
              </div>
              <Link
                href="/admin/products"
                className="shrink-0 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
              >
                Katalog
              </Link>
            </div>
            {recentOrdersList.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-emerald-200/60 bg-emerald-950/[0.04] px-3 py-2 text-[12px] leading-snug text-stone-800">
                <span className="font-bold text-emerald-800">Yeni sipariş</span>
                <span className="text-stone-400" aria-hidden>
                  ·
                </span>
                <span className="max-w-[min(200px,40vw)] truncate font-semibold text-stone-900">
                  {recentOrdersList[0].customer_name}
                </span>
                <span className="text-stone-400" aria-hidden>
                  ·
                </span>
                <span className="font-bold tabular-nums text-stone-900">{toTry(Number(recentOrdersList[0].total ?? 0))}</span>
                <span className="text-stone-400" aria-hidden>
                  ·
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-stone-600">
                  {formatLiveOrderStripAge(String(recentOrdersList[0].created_at ?? ""))}
                </span>
                <Link
                  href={`/admin/orders/${recentOrdersList[0].id}`}
                  className="ml-auto text-[11px] font-bold text-emerald-800 underline-offset-2 hover:underline"
                >
                  Aç →
                </Link>
              </div>
            ) : null}
            <ul className="mt-3 space-y-2.5">
              {recentOrdersList.length === 0 ? (
                <li className="rounded-xl border border-dashed border-stone-300 bg-stone-50/80 px-4 py-5 text-sm text-stone-700">
                  <p className="font-medium text-stone-900">Henüz sipariş yok</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700">
                    İlk sipariş için görselleri iyileştirin, fiyatı netleştirin ve ürünleri Trendyol&apos;a göndererek erişimi
                    büyütün.
                  </p>
                </li>
              ) : (
                recentOrdersList.map((o, index) => {
                  const badge = adminOrderListBadge(o);
                  const paymentBadge = paymentStatusBadge(String(o.payment_status ?? ""));
                  const isNewest = index === 0;
                  return (
                    <li
                      key={o.id}
                      className={`group grid grid-cols-1 gap-3 rounded-xl border px-4 py-3 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_10px_24px_-12px_rgba(28,25,23,0.18)] md:grid-cols-[minmax(0,1fr)_auto] ${
                        isNewest
                          ? "border-emerald-300/80 bg-gradient-to-r from-emerald-50/70 via-white to-stone-50/50 ring-2 ring-emerald-500/20 hover:border-emerald-400/90 hover:ring-emerald-500/25"
                          : "border-stone-200/80 bg-stone-50/35 hover:border-stone-300/80 hover:bg-stone-50 hover:ring-1 hover:ring-stone-300/35"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-xs font-medium tracking-wide text-stone-700" title={o.order_number}>
                            {shortenOrderNumberDisplay(o.order_number)}
                          </p>
                          {isNewest ? (
                            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              En yeni
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm font-semibold text-stone-950">{o.customer_name}</p>
                        <p className="mt-1 text-[11px] font-medium tabular-nums text-stone-500">
                          {formatOrderRelativeTimeTr(o.created_at)}
                        </p>
                        <p className="mt-1.5 text-[11px] text-stone-500 opacity-0 transition-opacity group-hover:opacity-100">
                          {paymentBadge.label} · {badge.label}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2 md:flex-nowrap">
                        <span className={paymentBadge.pill}>{paymentBadge.label}</span>
                        <span className={badge.pill}>{badge.label}</span>
                        <div className="min-w-[84px] text-right">
                          <OrderListTryPrice n={Number(o.total ?? 0)} />
                        </div>
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-400 hover:bg-stone-100 hover:text-stone-950 active:scale-[0.99]"
                        >
                          Detay
                        </Link>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

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

          <section className="rounded-2xl border border-stone-200/75 bg-white p-5 shadow-[0_3px_16px_-8px_rgba(28,25,23,0.06)]">
            <h2 className="text-base font-semibold text-stone-950">Analytics özeti (bugün)</h2>
            <p className="mt-1 text-[11px] font-medium text-stone-500">Vitrin davranışı · operasyon kartlarının altında</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric title="Visitors today" value={dashboardAnalytics.visitorsToday.toLocaleString("tr-TR")} />
              <Metric title="Product views" value={dashboardAnalytics.productViews.toLocaleString("tr-TR")} />
              <Metric title="Add to carts" value={dashboardAnalytics.addToCarts.toLocaleString("tr-TR")} />
              <Metric title="Checkout starts" value={dashboardAnalytics.checkoutStarts.toLocaleString("tr-TR")} />
              <Metric title="Purchases" value={dashboardAnalytics.purchases.toLocaleString("tr-TR")} />
              <Metric
                title="Conversion rate"
                value={`${dashboardAnalytics.conversionRate.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}%`}
              />
            </div>
            <div className="mt-4 rounded-xl border border-stone-200/70 bg-stone-50/50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">
                Funnel: View product → Add to cart → Checkout → Purchase
              </p>
              <p className="mt-1 text-sm text-stone-700">
                {dashboardAnalytics.funnel.view_item.toLocaleString("tr-TR")} →{" "}
                {dashboardAnalytics.funnel.add_to_cart.toLocaleString("tr-TR")} →{" "}
                {dashboardAnalytics.funnel.begin_checkout.toLocaleString("tr-TR")} →{" "}
                {dashboardAnalytics.funnel.purchase.toLocaleString("tr-TR")}
              </p>
            </div>
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">Top viewed products</p>
              {dashboardAnalytics.topViewedProducts.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">Henüz görüntülenme verisi yok.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {dashboardAnalytics.topViewedProducts.map((row) => (
                    <li key={row.productId} className="flex items-center justify-between rounded-lg border border-stone-200/70 bg-white px-3 py-2">
                      <span className="truncate text-sm text-stone-800">{row.productName}</span>
                      <span className="text-sm font-semibold tabular-nums text-stone-900">{row.views.toLocaleString("tr-TR")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
