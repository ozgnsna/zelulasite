import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  adminProductsListBulkAction,
  bulkDeleteProductsAction,
  sendAllProductsToTrendyolAction,
  syncTrendyolProductNow,
} from "@/app/actions/admin";
import { AdminProductDeleteMenuButton } from "@/components/admin/products/AdminProductDeleteMenuButton";
import { AdminProductsScrollPersistence } from "@/components/admin/products/AdminProductsScrollPersistence";
import { AdminProductsSelectionToolbar } from "@/components/admin/products/AdminProductsSelectionToolbar";
import {
  buildOptimizeHints,
  computePriceBenchmarks,
  dominantAndSecondaryIssues,
  marketAvgHintForProduct,
  problemDominantBadgeClass,
  problemLabelsForProduct,
  problemSecondaryPillClass,
  type ProductListOptRow,
} from "@/lib/admin/products-list-optimization";
import {
  buildProductListSuggestion,
  classifyProductSalesRow,
  computePopularSalesThreshold,
  isListedOnTrendyol,
  parseViewItemProductIdFromEcommerce,
  type ProductRowPriority,
} from "@/lib/admin/products-list-sales";
import { AdminProductOptimizePanel } from "@/components/admin/products/AdminProductOptimizePanel";
import { AdminProductsBulkQuickOptimizeButton } from "@/components/admin/products/AdminProductsBulkQuickOptimizeButton";
import { ADMIN_OPERATIONS_MAIN } from "@/lib/admin/admin-shell-layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRENDYOL_IMPORTED_REVIEW_NOTE } from "@/lib/marketplaces/trendyol/products";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BULK_FORM_ID = "admin-products-bulk";
const PAGE_SIZE = 12;

type ProductListRow = ProductListOptRow & {
  short_description: string | null;
  full_description: string | null;
  product_images?: { image_url?: string | null; is_cover?: boolean | null; sort_order?: number | null }[] | null;
};

function importedNeedsReviewFn(p: ProductListRow): boolean {
  const isActive = Boolean(p.is_active);
  const shortNote = String(p.short_description ?? "").includes(TRENDYOL_IMPORTED_REVIEW_NOTE);
  const fullNote = String(p.full_description ?? "").includes(TRENDYOL_IMPORTED_REVIEW_NOTE);
  return !isActive && (shortNote || fullNote);
}

function missingTrendyolFieldLabels(p: ProductListRow): string[] {
  const missing: string[] = [];
  if (!Boolean(p.trendyol_active)) return missing;
  if (!String(p.sku ?? "").trim()) missing.push("SKU");
  if (!String(p.trendyol_category_id ?? "").trim()) missing.push("Kategori");
  if (!String(p.trendyol_barcode ?? "").trim()) missing.push("Barkod");
  if (!String(p.trendyol_stock_code ?? "").trim()) missing.push("Stok kodu");
  return missing;
}

function unwrapJoinedOrder(
  order: unknown,
): { payment_status?: string; order_status?: string } | null {
  if (!order) return null;
  if (Array.isArray(order)) return (order[0] as { payment_status?: string; order_status?: string }) ?? null;
  return order as { payment_status?: string; order_status?: string };
}

function priorityBadge(priority: ProductRowPriority): { label: string; className: string } {
  if (priority === "critical") {
    return {
      label: "Kritik",
      className: "border-rose-200/70 bg-rose-50/80 text-rose-900/90",
    };
  }
  if (priority === "needs_improvement") {
    return {
      label: "Geliştir",
      className: "border-amber-200/70 bg-amber-50/70 text-amber-950/90",
    };
  }
  return {
    label: "Sağlıklı",
    className: "border-stone-200/80 bg-stone-50/80 text-stone-600",
  };
}

function rowShellClass(priority: ProductRowPriority): string {
  if (priority === "critical") {
    return "border-l-2 border-l-rose-400/50 bg-rose-50/15";
  }
  if (priority === "needs_improvement") {
    return "border-l-2 border-l-amber-300/50 bg-amber-50/10";
  }
  return "border-l border-l-transparent bg-white/75";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    trendyol?: string;
    stock?: string;
    review?: string;
    sales?: string;
    sort?: "newest" | "oldest";
    editProduct?: string;
    deleted?: string;
    deleteError?: string;
    bulkOk?: string;
    bulkCount?: string;
    bulkError?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().toLowerCase();
  const statusFilter = (sp.status ?? "all").trim();
  const trendyolFilter = (sp.trendyol ?? "all").trim();
  const stockFilter = (sp.stock ?? "all").trim();
  const reviewFilter = (sp.review ?? "all").trim();
  const salesFilter = (sp.sales ?? "all").trim();
  const sortFilter = (sp.sort ?? "newest").trim() === "oldest" ? "oldest" : "newest";
  const pageRaw = Math.max(1, parseInt(String(sp.page ?? "1").trim(), 10) || 1);
  const deletedCount = Number(sp.deleted ?? 0);
  const deleteError = sp.deleteError ?? "";
  const bulkOk = (sp.bulkOk ?? "").trim();
  const bulkCount = Number(sp.bulkCount ?? 0);
  const bulkError = (sp.bulkError ?? "").trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? "")) redirect("/admin/login");

  const admin = createAdminClient();
  const productSelect =
    "id,name,sku,price,compare_at_price,stock_quantity,is_active,category_id,trendyol_active,trendyol_category_id,trendyol_barcode,trendyol_stock_code,short_description,full_description,product_images(image_url,is_cover,sort_order)";

  const [{ data: products }, { data: orderItemsSales }, { data: viewEvents }] = await Promise.all([
    admin
      .from("products")
      .select(productSelect)
      .order("created_at", { ascending: sortFilter === "oldest" })
      .limit(400),
    admin
      .from("order_items")
      .select("product_id,quantity,order:orders!inner(payment_status,order_status)")
      .eq("order.payment_status", "paid")
      .neq("order.order_status", "cancelled")
      .limit(8000),
    admin
      .from("analytics_events")
      .select("event_name,ecommerce")
      .eq("event_name", "view_item")
      .order("occurred_at", { ascending: false })
      .limit(4000),
  ]);

  const salesByProduct = new Map<string, number>();
  for (const item of orderItemsSales ?? []) {
    const pid = String((item as { product_id?: string | null }).product_id ?? "").trim();
    if (!pid) continue;
    const ord = unwrapJoinedOrder((item as { order?: unknown }).order);
    if (!ord || ord.payment_status !== "paid" || ord.order_status === "cancelled") continue;
    const qty = Number((item as { quantity?: number }).quantity ?? 0);
    salesByProduct.set(pid, (salesByProduct.get(pid) ?? 0) + (Number.isFinite(qty) ? qty : 0));
  }

  const viewsByProduct = new Map<string, number>();
  for (const ev of viewEvents ?? []) {
    const pid = parseViewItemProductIdFromEcommerce((ev as { ecommerce?: unknown }).ecommerce);
    if (!pid) continue;
    viewsByProduct.set(pid, (viewsByProduct.get(pid) ?? 0) + 1);
  }

  const popularThreshold = computePopularSalesThreshold(salesByProduct);

  const allRows = (products ?? []) as ProductListRow[];
  const priceBenchmarks = computePriceBenchmarks(allRows);
  const totalCatalog = allRows.length;
  const listedActiveCount = allRows.filter((p) => Boolean(p.is_active) && isListedOnTrendyol(p)).length;
  const readinessPct =
    totalCatalog > 0 ? Math.min(100, Math.round((listedActiveCount / totalCatalog) * 100)) : 0;
  const rows = allRows.filter((p) => {
    if (!query) return true;
    const hay = `${p.name ?? ""} ${p.sku ?? ""}`.toLowerCase();
    return hay.includes(query);
  });

  const baseFiltered = rows.filter((p) => {
    const stock = Number(p.stock_quantity ?? 0);
    const isActive = Boolean(p.is_active);
    const isTrendyolActive = Boolean(p.trendyol_active);
    const importedNeedsReview = importedNeedsReviewFn(p);
    const hasTyCore = Boolean(String(p.trendyol_category_id ?? "").trim() && String(p.sku ?? "").trim());

    if (statusFilter === "active" && !isActive) return false;
    if (statusFilter === "passive" && isActive) return false;
    if (trendyolFilter === "on" && !isTrendyolActive) return false;
    if (trendyolFilter === "off" && isTrendyolActive) return false;
    if (trendyolFilter === "missing" && hasTyCore) return false;
    if (stockFilter === "low" && !(stock > 0 && stock <= 3)) return false;
    if (stockFilter === "out" && stock !== 0) return false;
    if (reviewFilter === "only" && !importedNeedsReview) return false;
    return true;
  });

  const filteredRows = baseFiltered.filter((p) => {
    const salesQty = salesByProduct.get(String(p.id)) ?? 0;
    if (salesFilter === "no_sales" && salesQty !== 0) return false;
    if (salesFilter === "has_sales" && salesQty === 0) return false;
    if (salesFilter === "popular" && salesQty < popularThreshold) return false;
    return true;
  });

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(pageRaw, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE);
  const rangeLabel =
    totalFiltered === 0
      ? "0 ürün"
      : `${(pageStart + 1).toLocaleString("tr-TR")}–${Math.min(pageStart + PAGE_SIZE, totalFiltered).toLocaleString("tr-TR")} / ${totalFiltered.toLocaleString("tr-TR")} ürün`;

  const listQuery = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const q = overrides.q !== undefined ? overrides.q : (sp.q ?? "").trim();
    const status = overrides.status !== undefined ? overrides.status : statusFilter;
    const trendyol = overrides.trendyol !== undefined ? overrides.trendyol : trendyolFilter;
    const stock = overrides.stock !== undefined ? overrides.stock : stockFilter;
    const review = overrides.review !== undefined ? overrides.review : reviewFilter;
    const sales = overrides.sales !== undefined ? overrides.sales : salesFilter;
    const sort = overrides.sort !== undefined ? overrides.sort : sortFilter;
    const page = overrides.page !== undefined ? overrides.page : String(currentPage);
    if (q) p.set("q", q);
    if (status && status !== "all") p.set("status", status);
    if (trendyol && trendyol !== "all") p.set("trendyol", trendyol);
    if (stock && stock !== "all") p.set("stock", stock);
    if (review && review !== "all") p.set("review", review);
    if (sales && sales !== "all") p.set("sales", sales);
    if (sort && sort !== "newest") p.set("sort", sort);
    if (page && page !== "1") p.set("page", page);
    const s = p.toString();
    return s ? `/admin/products?${s}` : "/admin/products";
  };

  const pageWindow = 2;
  const pageNums: number[] = [];
  for (let i = Math.max(1, currentPage - pageWindow); i <= Math.min(totalPages, currentPage + pageWindow); i++) {
    pageNums.push(i);
  }

  const syncFormProductIds = paginatedRows.map((p) => p.id);

  const activeCount = allRows.filter((p) => Boolean(p.is_active)).length;
  const lowStockCount = allRows.filter((p) => {
    const stock = Number(p.stock_quantity ?? 0);
    return stock > 0 && stock <= 3;
  }).length;
  const missingTrendyolCount = allRows.filter((p) => {
    if (!Boolean(p.trendyol_active)) return false;
    const sku = String(p.sku ?? "").trim();
    const categoryId = String(p.trendyol_category_id ?? "").trim();
    return !sku || !categoryId;
  }).length;
  const reviewCount = allRows.filter((p) => importedNeedsReviewFn(p)).length;
  const totalWarningCount = lowStockCount + missingTrendyolCount + reviewCount;

  const criticalListCount = allRows.filter((p) => {
    const stock = Number(p.stock_quantity ?? 0);
    const listed = isListedOnTrendyol(p);
    return stock === 0 || (Boolean(p.is_active) && !listed);
  }).length;

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }).format(value);

  const filterHidden = (
    <>
      <input type="hidden" name="q" value={sp.q ?? ""} />
      <input type="hidden" name="status" value={statusFilter} />
      <input type="hidden" name="trendyol" value={trendyolFilter} />
      <input type="hidden" name="stock" value={stockFilter} />
      <input type="hidden" name="review" value={reviewFilter} />
      <input type="hidden" name="sales" value={salesFilter} />
      <input type="hidden" name="sort" value={sortFilter} />
      {currentPage > 1 ? <input type="hidden" name="page" value={String(currentPage)} /> : null}
    </>
  );

  return (
    <main className="min-h-dvh bg-[#eceae6]">
      <AdminProductsScrollPersistence />
      <div className={`${ADMIN_OPERATIONS_MAIN} py-4 lg:py-5`}>
        {deletedCount > 0 ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            {deletedCount} ürün silindi.
          </p>
        ) : null}
        {bulkOk === "trendyol" && bulkCount > 0 ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            {bulkCount} ürün Trendyol&apos;a gönderildi (sırayla senkron).
          </p>
        ) : null}
        {bulkOk === "trendyol_all" && bulkCount > 0 ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            Katalogdaki {bulkCount.toLocaleString("tr-TR")} ürünün tamamı Trendyol&apos;a gönderildi (sırayla).
          </p>
        ) : null}
        {bulkOk === "price" && bulkCount > 0 ? (
          <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
            {bulkCount} ürün için fiyat/stok Trendyol&apos;a iletildi.
          </p>
        ) : null}
        {bulkOk === "disable" && bulkCount > 0 ? (
          <p className="mb-4 rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-xs text-stone-900">
            {bulkCount} ürün vitrinde kapatıldı (pasif).
          </p>
        ) : null}
        {bulkError === "disable_failed" ? (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
            Toplu pasifleştirme tamamlanamadı. Tekrar deneyin.
          </p>
        ) : null}
        {deleteError ? (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {deleteError === "no_selection"
              ? "İşlem için en az bir ürün seç."
              : deleteError === "confirm_required"
                ? "Silme onayı için kutuyu işaretleyip SIL yaz."
                : "Ürün silme sırasında hata oluştu. İlişkili kayıtlar olabilir."}
          </p>
        ) : null}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/60 pb-3">
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold tracking-tight text-stone-900">Ürünler</h1>
            <p className="mt-0.5 text-[11px] text-stone-500">Stok, fiyat, Trendyol — filtre ve toplu işlemler.</p>
          </div>
          <div className="flex shrink-0 items-center">
            <Link
              href="/admin/products/new"
              className="rounded-lg bg-stone-900 px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Yeni ürün
            </Link>
          </div>
        </div>

        <section className="mb-3 rounded-lg border border-stone-200/60 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-md border border-stone-100 bg-stone-50/70 px-2 py-1.5">
              <p className="text-[9px] font-medium text-stone-500">Toplam ürün</p>
              <p className="text-sm font-semibold tabular-nums text-stone-900">{allRows.length}</p>
            </div>
            <div className="rounded-md border border-stone-100 bg-stone-50/70 px-2 py-1.5">
              <p className="text-[9px] font-medium text-stone-500">Aktif ürün</p>
              <p className="text-sm font-semibold tabular-nums text-stone-900">{activeCount}</p>
            </div>
            <div className="rounded-md border border-amber-100/80 bg-amber-50/40 px-2 py-1.5">
              <p className="text-[9px] font-medium text-amber-900/80">Trendyol eksik</p>
              <p className="text-sm font-semibold tabular-nums text-amber-950">{missingTrendyolCount}</p>
            </div>
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-stone-500">
            Kritik ürün: <span className="font-semibold text-stone-700">{criticalListCount}</span>
            <span className="mx-1.5 text-stone-300">·</span>
            Uyarı (stok / inceleme / TY): <span className="font-semibold text-stone-700">{totalWarningCount}</span>
            <span className="mx-1.5 text-stone-300">·</span>
            Hazırlık <span className="font-semibold text-stone-800">{readinessPct}%</span>
            <span className="mx-1 text-stone-400">·</span>
            <span className="text-stone-400">Aktif + TY tam / {totalCatalog} kayıt</span>
            <span className="mx-1.5 text-stone-300">·</span>
            <Link href="/admin/trendyol" className="text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-800">
              Trendyol paneli
            </Link>
          </p>
          <form className="mt-1.5 space-y-1.5" method="get">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="min-w-[min(100%,16rem)] flex-[1.35]">
                <label className="sr-only" htmlFor="admin-products-q">
                  Ara
                </label>
                <input
                  id="admin-products-q"
                  name="q"
                  defaultValue={sp.q ?? ""}
                  placeholder="Ad veya SKU ara…"
                  className="h-9 w-full rounded-lg border border-stone-300/90 bg-white px-3 text-[13px] text-stone-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300/60"
                />
              </div>
              <select
                name="status"
                defaultValue={statusFilter}
                className="h-7 min-w-[6.75rem] rounded-md border border-stone-200/80 bg-stone-50/80 px-2 text-[11px] text-stone-600"
              >
                <option value="all">Durum: Tümü</option>
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
              <select
                name="trendyol"
                defaultValue={trendyolFilter}
                className="h-7 min-w-[8.25rem] rounded-md border border-stone-200/80 bg-stone-50/80 px-2 text-[11px] text-stone-600"
              >
                <option value="all">Trendyol: Tümü</option>
                <option value="on">TY açık</option>
                <option value="off">TY kapalı</option>
                <option value="missing">TY eksik alan</option>
              </select>
              <button
                type="submit"
                className="h-7 shrink-0 rounded-md bg-stone-900 px-3 text-[11px] font-medium text-white hover:bg-stone-800"
              >
                Ara
              </button>
              <Link
                href="/admin/products"
                className="inline-flex h-7 shrink-0 items-center rounded-md border border-transparent px-2 text-[11px] font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700"
              >
                Temizle
              </Link>
            </div>
            <details className="rounded-md border border-stone-100 bg-stone-50/50 px-2 py-1">
              <summary className="cursor-pointer list-none text-[10px] font-normal text-stone-500 [&::-webkit-details-marker]:hidden">
                <span className="hover:text-stone-700">Daha fazla filtre</span>
              </summary>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-stone-200/40 pt-1.5">
                <select
                  name="stock"
                  defaultValue={stockFilter}
                  className="h-7 min-w-[8rem] rounded-md border border-stone-200/80 bg-white/90 px-2 text-[11px] text-stone-600"
                >
                  <option value="all">Stok: Tümü</option>
                  <option value="low">Stok: Az (1–3)</option>
                  <option value="out">Stok: Tükendi</option>
                </select>
                <select
                  name="review"
                  defaultValue={reviewFilter}
                  className="h-7 min-w-[8.5rem] rounded-md border border-stone-200/80 bg-white/90 px-2 text-[11px] text-stone-600"
                >
                  <option value="all">İnceleme: Tümü</option>
                  <option value="only">İncelenecek</option>
                </select>
                <select
                  name="sales"
                  defaultValue={salesFilter}
                  className="h-7 min-w-[8.5rem] rounded-md border border-stone-200/80 bg-white/90 px-2 text-[11px] text-stone-600"
                >
                  <option value="all">Satış: Tümü</option>
                  <option value="no_sales">Satmıyor</option>
                  <option value="has_sales">Satış var</option>
                  <option value="popular">Popüler</option>
                </select>
                <select
                  name="sort"
                  defaultValue={sortFilter}
                  className="h-7 min-w-[7.5rem] rounded-md border border-stone-200/80 bg-white/90 px-2 text-[11px] text-stone-600"
                >
                  <option value="newest">En yeni</option>
                  <option value="oldest">En eski</option>
                </select>
                <button
                  type="submit"
                  className="h-7 rounded-md border border-stone-200/90 bg-white px-2.5 text-[11px] font-medium text-stone-600 hover:bg-stone-50"
                >
                  Uygula
                </button>
              </div>
            </details>
          </form>
          {salesFilter === "popular" ? (
            <p className="mt-1.5 text-[10px] text-stone-500">
              Popüler eşik: <span className="font-medium text-stone-700">{popularThreshold}+</span> satış
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-stone-200/60 bg-white p-2 shadow-sm sm:p-2.5">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2 border-b border-stone-100/90 pb-2.5">
            <div className="min-w-0">
              <h2 className="text-xs font-semibold text-stone-900">Liste</h2>
              <p className="text-[10px] tabular-nums text-stone-500">{rangeLabel}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {totalPages > 1 ? (
                <nav className="flex flex-wrap items-center gap-0.5" aria-label="Sayfalama">
                  {currentPage > 1 ? (
                    <Link
                      href={listQuery({ page: String(currentPage - 1) })}
                      className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-stone-700 hover:bg-stone-50"
                    >
                      ‹
                    </Link>
                  ) : null}
                  {pageNums.map((n) => (
                    <Link
                      key={n}
                      href={listQuery({ page: String(n) })}
                      className={`min-w-[1.5rem] rounded border px-1 py-0.5 text-center text-[10px] font-medium tabular-nums ${
                        n === currentPage ? "border-stone-800 bg-stone-800 text-white" : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      {n}
                    </Link>
                  ))}
                  {currentPage < totalPages ? (
                    <Link
                      href={listQuery({ page: String(currentPage + 1) })}
                      className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-stone-700 hover:bg-stone-50"
                    >
                      ›
                    </Link>
                  ) : null}
                </nav>
              ) : null}
              <form action={sendAllProductsToTrendyolAction} data-save-scroll-on-submit="true" className="inline">
                <button
                  type="submit"
                  className="rounded border border-stone-300 bg-white px-2 py-1 text-[10px] font-medium text-stone-700 hover:bg-stone-50"
                >
                  Tüm kataloğu TY
                </button>
              </form>
              <Link
                href="/admin/products/new"
                className="rounded border border-stone-300 bg-white px-2 py-1 text-[10px] font-medium text-stone-700 hover:bg-stone-50"
              >
                + Yeni
              </Link>
            </div>
          </div>
          <form
            id={BULK_FORM_ID}
            action={adminProductsListBulkAction}
            className="products-bulk-form"
            data-save-scroll-on-submit="true"
          >
            {filterHidden}
            <div className="bulk-selection-bar mb-2 flex flex-col gap-1.5 rounded-md border border-amber-200/50 bg-amber-50/30 px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between">
              <AdminProductsSelectionToolbar formId={BULK_FORM_ID} />
              <div className="flex flex-wrap items-center gap-1.5">
                <AdminProductsBulkQuickOptimizeButton formId={BULK_FORM_ID} />
                <button
                  type="submit"
                  name="intent"
                  value="trendyol_send"
                  className="rounded-md border border-amber-600/80 bg-gradient-to-b from-amber-500 to-amber-600 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm hover:from-amber-500 hover:to-amber-700"
                >
                  Seçilileri Trendyol&apos;a gönder
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="price_sync"
                  className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-[10px] font-medium text-stone-800 hover:bg-stone-50"
                >
                  Fiyat / stok
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="disable"
                  className="rounded-md border border-stone-700/20 bg-stone-800 px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-stone-900"
                >
                  Pasifleştir
                </button>
              </div>
            </div>

            <div className="divide-y divide-stone-100 rounded-md border border-stone-200/50 bg-stone-50/30">
              {paginatedRows.map((p) => {
                const stock = Number(p.stock_quantity ?? 0);
                const importedNeedsReview = importedNeedsReviewFn(p);
                const missingTrendyolFields = missingTrendyolFieldLabels(p);
                const stockLow = stock > 0 && stock <= 3;
                const salesQty = salesByProduct.get(String(p.id)) ?? 0;
                const views = viewsByProduct.get(String(p.id)) ?? 0;
                const listed = isListedOnTrendyol(p);
                const isActive = Boolean(p.is_active);
                const priority = classifyProductSalesRow({ stock, isActive, listedOnMarketplace: listed, salesQty });
                const previewImageUrl = Array.isArray(p.product_images)
                  ? (
                      p.product_images?.find((img) => Boolean(img.is_cover) && String(img.image_url ?? "").trim()) ??
                      p.product_images?.find((img) => String(img.image_url ?? "").trim())
                    )?.image_url ?? ""
                  : "";
                const hasCoverImage = Boolean(
                  p.product_images?.some((img) => Boolean(img.is_cover) && String(img.image_url ?? "").trim()),
                );
                const suggestion = buildProductListSuggestion({
                  priority,
                  stock,
                  isActive,
                  listedOnMarketplace: listed,
                  salesQty,
                  views,
                  hasCoverImage,
                  importedNeedsReview,
                });
                const badge = priorityBadge(priority);
                const rowClass = rowShellClass(priority);
                const cid = String(p.category_id ?? "").trim();
                const categoryAvg = cid ? priceBenchmarks.byCategory.get(cid) ?? null : null;
                const marketHint = marketAvgHintForProduct(p, priceBenchmarks);
                const problemLabels = problemLabelsForProduct({
                  isActive,
                  listedOnMarketplace: listed,
                  salesQty,
                  stock,
                  views,
                  hasCoverImage,
                  name: String(p.name ?? ""),
                });
                const { dominant: domIssue, secondary: secIssues } = dominantAndSecondaryIssues(problemLabels);
                const optimizeHints = buildOptimizeHints({
                  name: String(p.name ?? ""),
                  price: Number(p.price ?? 0),
                  compareAt: p.compare_at_price != null ? Number(p.compare_at_price) : null,
                  salesQty,
                  views,
                  listed,
                  hasCoverImage,
                  marketHint,
                  categoryAvg,
                  catalogAvg: priceBenchmarks.global,
                  priority,
                });
                const tyStatusShort = !Boolean(p.trendyol_active)
                  ? "Kapalı"
                  : listed
                    ? "Tamam"
                    : "Eksik";
                const tyHintParts = [
                  ...missingTrendyolFields,
                  importedNeedsReview ? "İnceleme" : null,
                  !isActive ? "Pasif" : null,
                ].filter(Boolean) as string[];
                const tyTitle = tyHintParts.length ? `Trendyol: ${tyHintParts.join(", ")}` : undefined;

                return (
                  <div
                    key={p.id}
                    className={`product-row group border-b border-stone-100/80 px-2.5 py-2.5 transition-colors last:border-b-0 sm:px-3 sm:py-3 hover:bg-white/90 ${rowClass}`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-between sm:gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          type="checkbox"
                          name="product_ids"
                          value={p.id}
                          className="mt-2.5 size-3.5 shrink-0 rounded border-stone-300 text-stone-900"
                          aria-label={`${p.name} ürününü seç`}
                        />
                        <Link
                          href={`/admin/products/${encodeURIComponent(p.id)}/edit`}
                          className="flex min-w-0 flex-1 gap-3 rounded-md outline-none ring-stone-400/0 transition hover:ring-1 focus-visible:ring-2 focus-visible:ring-stone-400/30"
                        >
                          <div className="relative size-11 shrink-0 overflow-hidden rounded-md border border-stone-200/80 bg-stone-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]">
                            {previewImageUrl ? (
                              <Image src={previewImageUrl} alt="" fill sizes="44px" className="object-cover" />
                            ) : (
                              <span className="flex h-full items-center justify-center text-[9px] text-stone-400">—</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <p className="truncate text-[15px] font-semibold leading-snug tracking-tight text-stone-900">{p.name}</p>
                            <p className="mt-1 font-mono text-[10px] font-normal uppercase tracking-wider text-stone-400">
                              {(p.sku || "—").toUpperCase()}
                            </p>
                            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                              <span className="text-[15px] font-semibold tabular-nums tracking-tight text-stone-900">
                                {formatPrice(Number(p.price ?? 0))}
                              </span>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
                                <span className={`tabular-nums ${stock === 0 ? "font-medium text-rose-700" : stockLow ? "font-medium text-amber-800" : "text-stone-500"}`}>
                                  Stok {stock}
                                </span>
                                <span className="hidden h-3 w-px bg-stone-200 sm:inline" aria-hidden />
                                <span className="tabular-nums text-stone-500" title={tyTitle}>
                                  Trendyol{" "}
                                  <span className="font-medium text-stone-700">{tyStatusShort}</span>
                                </span>
                              </div>
                            </div>
                            <details className="mt-2 group/details">
                              <summary className="cursor-pointer list-none text-[10px] font-normal text-stone-400 [&::-webkit-details-marker]:hidden">
                                <span className="hover:text-stone-600 group-open/details:text-stone-500">Detay ve uyarılar</span>
                              </summary>
                              <div className="mt-1 space-y-1 border-t border-stone-100/90 pt-1">
                                <div className="flex flex-wrap items-center gap-1">
                                  <span
                                    className={`rounded border px-1 py-px text-[8px] font-medium ${
                                      priority === "healthy" ? "border-stone-200 bg-stone-50 text-stone-600" : badge.className
                                    }`}
                                  >
                                    {badge.label}
                                  </span>
                                  <span className="text-[9px] tabular-nums text-stone-500">Satış {salesQty}</span>
                                  <span className="text-[9px] text-stone-400">·</span>
                                  <span className="text-[9px] text-stone-500">{views} görüntülenme</span>
                                  <span
                                    className={`rounded border px-1 py-px text-[8px] font-medium ${
                                      p.is_active ? "border-stone-200 bg-stone-50 text-stone-700" : "border-stone-200 bg-stone-100 text-stone-500"
                                    }`}
                                  >
                                    {p.is_active ? "Vitrin" : "Pasif"}
                                  </span>
                                </div>
                                {missingTrendyolFields.length > 0 ? (
                                  <p className="text-[9px] text-amber-900/90">TY eksik: {missingTrendyolFields.join(", ")}</p>
                                ) : null}
                                {importedNeedsReview ? <p className="text-[9px] text-amber-900/90">İçe aktarma incelemesi gerekli.</p> : null}
                                {domIssue ? (
                                  <span className={`inline-block max-w-full text-[9px] ${problemDominantBadgeClass(domIssue.tone)}`}>
                                    <strong>{domIssue.label}</strong>
                                  </span>
                                ) : null}
                                {secIssues.length > 0 ? (
                                  <div className="flex flex-wrap gap-0.5">
                                    {secIssues.map((lab) => (
                                      <span key={lab.key} className={`text-[8px] ${problemSecondaryPillClass(lab.tone)}`}>
                                        {lab.label}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                                {priority !== "healthy" && marketHint ? (
                                  <p className="text-[9px] font-medium text-stone-700">Pazar: {marketHint}</p>
                                ) : null}
                                {priority !== "healthy" ? <p className="text-[9px] leading-snug text-stone-600">{suggestion}</p> : null}
                                <AdminProductOptimizePanel
                                  editHref={`/admin/products/${encodeURIComponent(p.id)}/edit`}
                                  hints={optimizeHints}
                                />
                              </div>
                            </details>
                          </div>
                        </Link>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 self-center pl-6 sm:pl-0">
                        <button
                          type="submit"
                          form={`sync-ty-${p.id}`}
                          className="rounded px-1 py-0.5 text-[9px] font-normal text-stone-400 hover:text-stone-600"
                        >
                          TY gönder
                        </button>
                        <Link
                          href={`/admin/products/${encodeURIComponent(p.id)}/edit`}
                          className="rounded-md border border-stone-800 bg-stone-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-stone-800"
                        >
                          Düzenle
                        </Link>
                        <details className="relative">
                          <summary className="list-none cursor-pointer rounded-md border border-stone-200/90 bg-white px-1.5 py-1 text-[11px] font-medium text-stone-400 hover:bg-stone-50 hover:text-stone-600 [&::-webkit-details-marker]:hidden">
                            ⋯
                          </summary>
                          <div className="absolute right-0 z-20 mt-0.5 w-36 overflow-hidden rounded border border-stone-200 bg-white py-0.5 shadow-md ring-1 ring-stone-900/5">
                            <Link
                              href={`/admin/products/${encodeURIComponent(p.id)}/edit#product-section-trendyol`}
                              className="block px-2 py-1 text-[10px] text-stone-700 hover:bg-stone-50"
                            >
                              Trendyol alanı
                            </Link>
                            <AdminProductDeleteMenuButton formId={`single-delete-${p.id}`} productName={p.name ?? "Ürün"} />
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredRows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-xs text-stone-500">
                  Ürün bulunamadı.
                </p>
              ) : null}
            </div>

            {filteredRows.length > 0 ? (
              <div className="mt-3 rounded-lg border border-stone-200/80 bg-stone-50/50 p-2.5">
                <p className="text-[10px] font-semibold text-stone-800">Toplu silme (onaylı)</p>
                <p className="mt-0.5 text-[9px] text-stone-600">
                  Ürünleri seç; onay kutusu ve SIL yazarak sil.
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-[10px] text-stone-700">
                    <input type="checkbox" name="confirm_delete" />
                    Onaylıyorum
                  </label>
                  <input
                    name="confirm_text"
                    placeholder="SIL"
                    className="rounded border border-stone-200 bg-white px-2 py-0.5 text-[10px]"
                  />
                  <button
                    type="submit"
                    name="intent"
                    value="delete"
                    className="rounded border border-rose-300/80 bg-white px-2 py-1 text-[10px] font-semibold text-rose-900 hover:bg-rose-50"
                  >
                    Seçilileri sil
                  </button>
                </div>
              </div>
            ) : null}
          </form>

          {syncFormProductIds.map((id) => (
            <form
              key={`sync-ty-${id}`}
              id={`sync-ty-${id}`}
              action={syncTrendyolProductNow}
              className="sr-only"
              aria-hidden
              data-save-scroll-on-submit="true"
            >
              <input type="hidden" name="product_id" value={id} />
            </form>
          ))}

          {paginatedRows.map((p) => (
            <form
              key={`single-delete-${p.id}`}
              id={`single-delete-${p.id}`}
              action={bulkDeleteProductsAction}
              className="sr-only"
              aria-hidden
              data-save-scroll-on-submit="true"
            >
              <input type="hidden" name="product_ids" value={p.id} />
              <input type="hidden" name="confirm_delete" value="on" />
              <input type="hidden" name="confirm_text" value="SIL" />
              <input type="hidden" name="q" value={sp.q ?? ""} />
              <input type="hidden" name="status" value={statusFilter} />
              <input type="hidden" name="trendyol" value={trendyolFilter} />
              <input type="hidden" name="stock" value={stockFilter} />
              <input type="hidden" name="review" value={reviewFilter} />
              <input type="hidden" name="sales" value={salesFilter} />
              <input type="hidden" name="sort" value={sortFilter} />
              {currentPage > 1 ? <input type="hidden" name="page" value={String(currentPage)} /> : null}
            </form>
          ))}

          <style>{`
            .products-bulk-form .bulk-selection-bar {
              display: none;
            }
            .products-bulk-form:has(input[name="product_ids"]:checked) .bulk-selection-bar {
              display: flex;
            }
            .products-bulk-form .product-row:has(input[name="product_ids"]:checked) {
              box-shadow: inset 0 0 0 1px rgba(180, 160, 120, 0.55);
              background: rgba(255, 252, 247, 0.95);
            }
          `}</style>
        </section>
      </div>
    </main>
  );
}
