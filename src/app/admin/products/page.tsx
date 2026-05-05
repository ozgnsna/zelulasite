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
  buildPriorityTopFive,
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
import { createAdminClient } from "@/lib/supabase/admin";
import { TRENDYOL_IMPORTED_REVIEW_NOTE } from "@/lib/marketplaces/trendyol/products";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BULK_FORM_ID = "admin-products-bulk";

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
      className: "border-rose-400/80 bg-rose-100/90 text-rose-950 ring-1 ring-rose-500/15",
    };
  }
  if (priority === "needs_improvement") {
    return {
      label: "Geliştir",
      className: "border-amber-400/75 bg-amber-50/95 text-amber-950 ring-1 ring-amber-600/12",
    };
  }
  return {
    label: "Sağlıklı",
    className: "border-emerald-300/70 bg-emerald-50/80 text-emerald-900 ring-1 ring-emerald-600/10",
  };
}

function rowShellClass(priority: ProductRowPriority): string {
  if (priority === "critical") {
    return "border-l-[4px] border-l-rose-600 bg-gradient-to-r from-rose-100/55 via-rose-50/40 to-white shadow-[0_1px_0_rgba(244,63,94,0.14)]";
  }
  if (priority === "needs_improvement") {
    return "border-l-[4px] border-l-amber-400 bg-gradient-to-r from-amber-50/35 to-white";
  }
  return "border-l border-l-stone-200/60 bg-white/70";
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
    editProduct?: string;
    deleted?: string;
    deleteError?: string;
    bulkOk?: string;
    bulkCount?: string;
    bulkError?: string;
  }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().toLowerCase();
  const statusFilter = (sp.status ?? "all").trim();
  const trendyolFilter = (sp.trendyol ?? "all").trim();
  const stockFilter = (sp.stock ?? "all").trim();
  const reviewFilter = (sp.review ?? "all").trim();
  const salesFilter = (sp.sales ?? "all").trim();
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
    admin.from("products").select(productSelect).order("created_at", { ascending: false }).limit(400),
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
  const priorityTopFive = buildPriorityTopFive(allRows, salesByProduct, viewsByProduct);
  const priorityStripIds = new Set(priorityTopFive.map((e) => e.product.id));
  const totalCatalog = allRows.length;
  const listedActiveCount = allRows.filter((p) => Boolean(p.is_active) && isListedOnTrendyol(p)).length;
  const readinessPct =
    totalCatalog > 0 ? Math.min(100, Math.round((listedActiveCount / totalCatalog) * 100)) : 0;
  const barWidthPct = readinessPct <= 0 ? 0 : Math.max(readinessPct, 4);
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

  const syncFormProductIds = [
    ...new Set([...filteredRows.map((p) => p.id), ...priorityTopFive.map((e) => e.product.id)]),
  ];

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
    </>
  );

  return (
    <main className="min-h-screen bg-[#faf6ef]">
      <AdminProductsScrollPersistence />
      <div className="container-premium py-6">
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
        <div className="mb-4 rounded-2xl border border-stone-200/55 bg-white/90 p-4 shadow-[0_2px_12px_-4px_rgba(28,25,23,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="font-serif text-3xl text-stone-950">Satış odaklı ürünler</h1>
              <p className="mt-1 text-sm text-stone-600">
                Stok, pazaryeri ve satış sinyalleriyle önceliklendirilmiş liste — vitrin ve Trendyol&apos;da büyümek için.
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-lg border border-stone-300/90 bg-stone-100/70 px-3 py-1.5 text-xs text-stone-700 transition hover:bg-stone-100"
            >
            Ana admin sayfası
          </Link>
        </div>
      </div>

        <section className="mb-4 rounded-2xl border border-rose-200/55 bg-gradient-to-br from-rose-50/90 via-amber-50/50 to-orange-50/35 p-4 shadow-[0_6px_24px_-8px_rgba(225,29,72,0.12)]">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-800/90">Acil</p>
              <h2 className="mt-1 font-serif text-xl font-bold tracking-tight text-rose-950 sm:text-2xl">
                Satış kaçırıyorsun
              </h2>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-rose-900/90">
                <li className="flex items-center gap-1">
                  <span className="text-rose-500" aria-hidden>
                    ●
                  </span>
                  Pazaryerinde yok
                </li>
                <li className="flex items-center gap-1">
                  <span className="text-rose-500" aria-hidden>
                    ●
                  </span>
                  Satmıyor
                </li>
                <li className="flex items-center gap-1">
                  <span className="text-rose-500" aria-hidden>
                    ●
                  </span>
                  Optimize değil
                </li>
              </ul>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-amber-950/90">
                Aşağıdaki 5 kayıt bugün müdahale etmen için sıralandı — önce Trendyol ve vitrin.
              </p>
            </div>
          </div>
          {priorityTopFive.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-amber-200/80 bg-white/70 px-3 py-2 text-xs text-amber-900/90">
              Şu an öncelik kriterine takılan ürün yok. Harika.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {priorityTopFive.map((entry) => {
                const p = entry.product as ProductListRow;
                const stock = Number(p.stock_quantity ?? 0);
                const salesQty = salesByProduct.get(String(p.id)) ?? 0;
                const views = viewsByProduct.get(String(p.id)) ?? 0;
                const listed = isListedOnTrendyol(p);
                const previewImageUrl = Array.isArray(p.product_images)
                  ? (
                      p.product_images?.find((img) => Boolean(img.is_cover) && String(img.image_url ?? "").trim()) ??
                      p.product_images?.find((img) => String(img.image_url ?? "").trim())
                    )?.image_url ?? ""
                  : "";
                const hasCover = Boolean(
                  p.product_images?.some((img) => Boolean(img.is_cover) && String(img.image_url ?? "").trim()),
                );
                const labels = problemLabelsForProduct({
                  isActive: Boolean(p.is_active),
                  listedOnMarketplace: listed,
                  salesQty,
                  stock,
                  views,
                  hasCoverImage: hasCover,
                  name: String(p.name ?? ""),
                });
                const { dominant: domPri, secondary: secPri } = dominantAndSecondaryIssues(labels);
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200/55 bg-white/90 px-2.5 py-2 shadow-sm transition hover:-translate-y-[3px] hover:shadow-[0_12px_28px_-10px_rgba(180,83,9,0.2)]"
                  >
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                      {previewImageUrl ? (
                        <Image src={previewImageUrl} alt={`${p.name ?? "Ürün"} önizleme`} fill sizes="40px" className="object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[9px] text-stone-400">—</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-stone-950">{p.name}</p>
                      <div className="mt-1 flex flex-col gap-1">
                        {domPri ? (
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wide text-stone-500">Birincil</span>
                            <div className="mt-0.5">
                              <span className={`inline-block w-fit max-w-full ${problemDominantBadgeClass(domPri.tone)}`}>
                                <strong className="font-extrabold">{domPri.label}</strong>
                              </span>
                            </div>
                          </div>
                        ) : null}
                        {secPri.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[9px] font-semibold text-stone-500">İkincil</span>
                            {secPri.map((lab) => (
                              <span key={lab.key} className={problemSecondaryPillClass(lab.tone)}>
                                {lab.label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <button
                        type="submit"
                        form={`sync-ty-${p.id}`}
                        className="rounded-xl border border-amber-800/95 bg-gradient-to-b from-amber-500 to-amber-600 px-3 py-2.5 text-left text-[11px] font-black leading-snug text-white shadow-[0_4px_14px_-3px_rgba(180,83,9,0.45)] transition hover:from-amber-400 hover:to-amber-600 sm:max-w-[11.5rem]"
                      >
                        Trendyol&apos;a gönder
                        <span className="mt-0.5 block text-[10px] font-bold text-amber-50/95">→ Satışa başla</span>
                      </button>
                      <Link
                        href={`/admin/products/${encodeURIComponent(p.id)}/edit`}
                        className="rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-[11px] font-semibold text-stone-800 shadow-sm hover:bg-stone-50"
                      >
                        Düzenle
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mb-4 rounded-2xl border border-stone-200/55 bg-white p-3 shadow-[0_2px_12px_-4px_rgba(28,25,23,0.05)]">
          <div className="mb-3 grid min-h-[5.25rem] gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex flex-col justify-center rounded-xl bg-stone-100/60 px-3 py-2">
              <p className="text-[11px] font-medium text-stone-500">Toplam ürün</p>
              <p className="mt-0.5 text-xl font-semibold tracking-tight text-stone-900">{allRows.length}</p>
            </div>
            <div className="flex flex-col justify-center rounded-xl bg-stone-100/60 px-3 py-2">
              <p className="text-[11px] font-medium text-stone-500">Aktif ürün</p>
              <p className="mt-0.5 text-xl font-semibold tracking-tight text-stone-900">{activeCount}</p>
            </div>
            <div className="flex flex-col justify-center rounded-xl bg-rose-100/50 px-3 py-2">
              <p className="text-[11px] font-medium text-rose-900/85">Kritik öncelik</p>
              <p className="mt-0.5 text-xl font-semibold tracking-tight text-rose-950">{criticalListCount}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-rose-800/85">Stok yok veya vitrinde ama pazaryerinde eksik</p>
            </div>
            <div className="flex flex-col justify-center rounded-xl bg-amber-100/50 px-3 py-2">
              <p className="text-[11px] font-medium text-amber-800/90">Trendyol eksik alan</p>
              <p className="mt-0.5 text-xl font-semibold tracking-tight text-amber-950">{missingTrendyolCount}</p>
            </div>
            <div className="flex flex-col justify-center rounded-xl bg-stone-100/55 px-3 py-2">
              <p className="text-[11px] font-medium text-stone-500">Diğer uyarılar</p>
              <p className="mt-0.5 text-xl font-semibold tracking-tight text-stone-900">{totalWarningCount}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-stone-600">Az stok + inceleme vb.</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-stone-200/70 bg-stone-50/50 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-semibold text-stone-800">Pazaryeri + vitrin tam</p>
              <p className="text-sm font-black tabular-nums text-stone-900">{readinessPct}%</p>
            </div>
            <p className="mt-0.5 text-[10px] text-stone-500">
              Aktif ve Trendyol&apos;da eksiksiz listelenen / toplam ürün (son {totalCatalog.toLocaleString("tr-TR")} kayıt)
            </p>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-stone-200/90">
              <div
                className="h-full min-w-0 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 transition-[width]"
                style={{ width: `${barWidthPct}%` }}
              />
            </div>
          </div>
          <form
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1.5fr)_repeat(5,minmax(100px,1fr))_auto_auto] lg:items-stretch"
            method="get"
          >
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Ürün adı veya SKU ara..."
              className="h-9 w-full rounded-lg border border-stone-200/90 bg-white px-3 text-sm text-stone-900 shadow-sm placeholder:text-stone-400"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="h-9 rounded-lg border border-stone-200/90 bg-white px-2.5 text-sm text-stone-800 shadow-sm"
            >
              <option value="all">Durum: Tümü</option>
              <option value="active">Durum: Aktif</option>
              <option value="passive">Durum: Pasif</option>
            </select>
            <select
              name="trendyol"
              defaultValue={trendyolFilter}
              className="h-9 rounded-lg border border-stone-200/90 bg-white px-2.5 text-sm text-stone-800 shadow-sm"
            >
              <option value="all">Trendyol: Tümü</option>
              <option value="on">Trendyol: Açık</option>
              <option value="off">Trendyol: Kapalı</option>
              <option value="missing">Trendyol: Eksik alanlı</option>
            </select>
            <select
              name="stock"
              defaultValue={stockFilter}
              className="h-9 rounded-lg border border-stone-200/90 bg-white px-2.5 text-sm text-stone-800 shadow-sm"
            >
              <option value="all">Stok: Tümü</option>
              <option value="low">Stok: Az (1-3)</option>
              <option value="out">Stok: Tükendi (0)</option>
            </select>
            <select
              name="review"
              defaultValue={reviewFilter}
              className="h-9 rounded-lg border border-stone-200/90 bg-white px-2.5 text-sm text-stone-800 shadow-sm"
            >
              <option value="all">İnceleme: Tümü</option>
              <option value="only">İncelenecek ürünler</option>
            </select>
            <select
              name="sales"
              defaultValue={salesFilter}
              className="h-9 rounded-lg border border-stone-200/90 bg-white px-2.5 text-sm text-stone-800 shadow-sm"
            >
              <option value="all">Satış: Tümü</option>
              <option value="no_sales">Satış: Satmıyor (ürün)</option>
              <option value="has_sales">Satış: Satış var</option>
              <option value="popular">Satış: Popüler (üst dilim)</option>
            </select>
            <button
              type="submit"
              className="h-9 rounded-lg bg-stone-900 px-3 text-xs font-medium text-white shadow-sm hover:bg-stone-800"
            >
              Ara
            </button>
            <Link
              href="/admin/products"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm hover:bg-stone-50"
            >
              Temizle
            </Link>
          </form>
          {salesFilter === "popular" ? (
            <p className="mt-2 text-[11px] text-stone-500">
              Popüler eşik (ödenmiş sipariş adedi): <span className="font-semibold text-stone-800">{popularThreshold}+</span>
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-stone-200/55 bg-white p-3 shadow-[0_2px_12px_-4px_rgba(28,25,23,0.05)]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-stone-900">Liste ({filteredRows.length})</h2>
            <div className="flex flex-wrap items-center gap-2">
              <form action={sendAllProductsToTrendyolAction} data-save-scroll-on-submit="true">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700/90 bg-gradient-to-b from-amber-500 to-amber-600 px-3 py-2 text-[11px] font-black text-white shadow-md transition hover:from-amber-400 hover:to-amber-600 hover:shadow-lg"
                >
                  Tümünü Trendyol&apos;a gönder
                  <span aria-hidden className="text-amber-100">
                    →
                  </span>
                </button>
              </form>
              <Link
                href="/admin/products/new"
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 shadow-sm transition hover:border-stone-400 hover:bg-stone-50"
              >
                <span aria-hidden className="text-base leading-none text-stone-500">
                  ➕
                </span>
                Yeni ürün
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
            <div className="bulk-selection-bar mb-2 flex flex-col gap-2 rounded-xl border border-stone-200/80 bg-gradient-to-r from-amber-50/40 via-white to-stone-50/60 px-3 py-2.5 shadow-[0_2px_10px_-4px_rgba(28,25,23,0.06)] sm:flex-row sm:items-center sm:justify-between">
              <AdminProductsSelectionToolbar formId={BULK_FORM_ID} />
              <div className="flex flex-wrap items-center gap-2">
                <AdminProductsBulkQuickOptimizeButton formId={BULK_FORM_ID} />
                <button
                  type="submit"
                  name="intent"
                  value="trendyol_send"
                  className="rounded-lg border border-amber-400/90 bg-amber-50/95 px-3 py-2 text-[11px] font-bold text-amber-950 shadow-sm transition hover:border-amber-500 hover:bg-amber-100"
                >
                  Seçilileri Trendyol&apos;a gönder
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="price_sync"
                  className="rounded-lg border border-stone-300/95 bg-white px-3 py-2 text-[11px] font-semibold text-stone-800 shadow-sm transition hover:border-stone-400 hover:bg-stone-50"
                >
                  Fiyat / stok senk.
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="disable"
                  className="rounded-lg border border-stone-600/25 bg-stone-800 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-stone-900"
                >
                  Seçilileri pasifleştir
                </button>
              </div>
            </div>

            <div className="divide-y divide-stone-100/90 rounded-xl border border-stone-200/60 bg-stone-50/20">
              {filteredRows.map((p) => {
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
                const hoverElev =
                  priority === "critical"
                    ? "hover:shadow-[0_20px_48px_-10px_rgba(244,63,94,0.32)]"
                    : priority === "needs_improvement"
                      ? "hover:shadow-[0_14px_38px_-10px_rgba(217,119,6,0.2)]"
                      : "hover:shadow-[0_8px_22px_-10px_rgba(28,25,23,0.08)]";
                const strongTrendyolCta = priority === "critical" || priorityStripIds.has(p.id);

                return (
                  <div
                    key={p.id}
                    className={`product-row group px-2.5 py-2 transition-all duration-200 ${
                      priority === "critical"
                        ? "hover:-translate-y-[3px] ring-1 ring-rose-500/15 hover:ring-rose-500/25"
                        : "hover:-translate-y-[2px]"
                    } hover:bg-white ${hoverElev} ${rowClass}`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-between sm:gap-3">
                      <div className="flex min-w-0 flex-1 gap-2.5">
                        <input
                          type="checkbox"
                          name="product_ids"
                          value={p.id}
                          className="mt-1 size-4 shrink-0 rounded border-stone-300 text-stone-900"
                          aria-label={`${p.name} ürününü seç`}
                        />
                        <Link
                          href={`/admin/products/${encodeURIComponent(p.id)}/edit`}
                          className="flex min-w-0 flex-1 gap-2.5 rounded-lg outline-none ring-stone-400/0 transition hover:ring-2 focus-visible:ring-2 focus-visible:ring-stone-400/40"
                        >
                          <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-stone-200/90 bg-stone-100 shadow-sm">
                            {previewImageUrl ? (
                              <Image src={previewImageUrl} alt={`${p.name ?? "Ürün"} görseli`} fill sizes="44px" className="object-cover" />
                            ) : (
                              <span className="flex h-full items-center justify-center text-[10px] text-stone-400">—</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-bold leading-tight text-stone-950">{p.name}</p>
                              <span
                                className={`shrink-0 rounded-full border px-2 py-px text-[9px] font-bold uppercase tracking-wide ${
                                  priority === "healthy"
                                    ? "border-stone-200/90 bg-stone-50/90 text-stone-600 ring-0"
                                    : badge.className
                                }`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-stone-600">
                              <span className="font-mono text-stone-500">{(p.sku || "—").toUpperCase()}</span>
                              <span className="text-stone-300"> · </span>
                              <span className="font-medium text-stone-800">{formatPrice(Number(p.price ?? 0))}</span>
                              <span className="text-stone-300"> · </span>
                              <span className={stock === 0 ? "font-semibold text-rose-700" : stockLow ? "font-semibold text-amber-800" : "text-stone-700"}>
                                Stok {stock}
                              </span>
                              <span className="text-stone-300"> · </span>
                              <span className="tabular-nums text-stone-700">Satış {salesQty}</span>
                              <span className="text-stone-300"> · </span>
                              <span className="tabular-nums text-stone-600">Görüntülenme {views}</span>
                            </p>
                            {priority !== "healthy" && marketHint ? (
                              <p className="mt-1 text-[11px] font-semibold leading-snug text-violet-950">
                                Pazar referansı: <span className="tabular-nums">{marketHint}</span>
                              </p>
                            ) : null}
                            {domIssue ? (
                              <div className="mt-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-stone-600">Birincil sorun</span>
                                <div className="mt-0.5">
                                  <span className={`inline-block max-w-full ${problemDominantBadgeClass(domIssue.tone)}`}>
                                    <strong className="font-extrabold">{domIssue.label}</strong>
                                  </span>
                                </div>
                                {secIssues.length > 0 ? (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                    <span className="text-[10px] font-semibold text-stone-500">İkincil:</span>
                                    {secIssues.map((lab) => (
                                      <span key={lab.key} className={problemSecondaryPillClass(lab.tone)}>
                                        {lab.label}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : priority === "healthy" ? (
                              <p className="mt-1 text-[10px] font-medium text-emerald-800/80">Belirgin sorun görünmüyor.</p>
                            ) : null}
                            {(() => {
                              const showVitrinChip =
                                priority !== "healthy" ||
                                !p.is_active ||
                                missingTrendyolFields.length > 0 ||
                                importedNeedsReview;
                              if (missingTrendyolFields.length === 0 && !importedNeedsReview && !showVitrinChip) {
                                return null;
                              }
                              return (
                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                  {missingTrendyolFields.map((field) => (
                                    <span
                                      key={`${p.id}-${field}`}
                                      className="rounded-full border border-orange-300/70 bg-orange-100/55 px-2 py-px text-[10px] font-semibold text-orange-950"
                                    >
                                      {field} eksik
                                    </span>
                                  ))}
                                  {importedNeedsReview ? (
                                    <span className="rounded-full border border-amber-300/70 bg-amber-100/55 px-2 py-px text-[10px] font-medium text-amber-900">
                                      İnceleme gerekli
                                    </span>
                                  ) : null}
                                  {showVitrinChip ? (
                                    <span
                                      className={`rounded-full border px-2 py-px text-[10px] font-semibold ${
                                        p.is_active
                                          ? "border-emerald-400/80 bg-emerald-50/90 text-emerald-900"
                                          : "border-stone-300/90 bg-stone-100/80 text-stone-600"
                                      }`}
                                    >
                                      {p.is_active ? "Vitrin açık" : "Vitrin kapalı"}
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })()}
                            {priority !== "healthy" ? (
                              <p className="mt-1 rounded-md border border-stone-200/60 bg-stone-50/80 px-2 py-1 text-[11px] font-medium leading-snug text-stone-600">
                                {suggestion}
                              </p>
                            ) : null}
                          </div>
                        </Link>
                      </div>
                      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-[min(100%,14rem)] sm:items-end">
                        <button
                          type="submit"
                          form={`sync-ty-${p.id}`}
                          className={
                            strongTrendyolCta
                              ? "w-full rounded-xl border border-amber-800/95 bg-gradient-to-b from-amber-500 to-amber-600 px-3 py-3 text-left text-xs font-black leading-snug text-white shadow-[0_8px_22px_-4px_rgba(180,83,9,0.5)] ring-1 ring-amber-200/60 transition hover:from-amber-400 hover:to-amber-600 hover:shadow-xl active:scale-[0.98] sm:min-w-[12.5rem]"
                              : "w-full rounded-lg border border-amber-300/90 bg-amber-50/90 px-3 py-2 text-center text-[11px] font-bold text-amber-950 shadow-sm transition hover:border-amber-400 hover:bg-amber-100/90 sm:min-w-[10.5rem]"
                          }
                        >
                          {strongTrendyolCta ? (
                            <>
                              Trendyol&apos;a gönder
                              <span className="mt-0.5 block text-[10px] font-bold text-amber-50/95">→ Satışa başla</span>
                            </>
                          ) : (
                            <>Trendyol&apos;a gönder</>
                          )}
                        </button>
                        <AdminProductOptimizePanel
                          editHref={`/admin/products/${encodeURIComponent(p.id)}/edit`}
                          hints={optimizeHints}
                        />
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Link
                            href={`/admin/products/${encodeURIComponent(p.id)}/edit`}
                            className="rounded-lg border border-stone-200/95 bg-stone-50/90 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-white"
                          >
                            Düzenle
                          </Link>
                          <details className="relative">
                            <summary className="list-none cursor-pointer rounded-lg border border-stone-300/90 bg-white px-2 py-1.5 text-[11px] font-medium text-stone-600 shadow-sm transition hover:bg-stone-100">
                              ⋯
                            </summary>
                            <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-stone-200/90 bg-white py-0.5 shadow-lg ring-1 ring-stone-900/5">
                              <Link
                                href={`/admin/products/${encodeURIComponent(p.id)}/edit#product-section-trendyol`}
                                className="block px-2.5 py-1.5 text-[11px] text-stone-700 hover:bg-stone-50"
                              >
                                Trendyol ayarları
                              </Link>
                              <AdminProductDeleteMenuButton formId={`single-delete-${p.id}`} productName={p.name ?? "Ürün"} />
                            </div>
                          </details>
                        </div>
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
              <div className="mt-4 rounded-xl border border-rose-200/90 bg-rose-50/50 p-3">
                <p className="text-[11px] font-semibold text-rose-950">Toplu silme (onaylı)</p>
                <p className="mt-0.5 text-[10px] text-rose-900/85">
                  Önce ürünleri seç; silmek için onay kutusunu işaretle ve SIL yaz.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-rose-900">
                    <input type="checkbox" name="confirm_delete" />
                    Silme işlemini onaylıyorum
                  </label>
                  <input
                    name="confirm_text"
                    placeholder="Onay için SIL yaz"
                    className="rounded border border-rose-200 bg-white px-2 py-1 text-[11px]"
                  />
                  <button
                    type="submit"
                    name="intent"
                    value="delete"
                    className="rounded-lg border border-rose-400 bg-white px-3 py-1.5 text-[11px] font-bold text-rose-950 shadow-sm hover:bg-rose-100"
                  >
                    Seçili ürünleri sil
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

          {filteredRows.map((p) => (
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
              box-shadow:
                inset 0 0 0 2px rgba(245, 158, 11, 0.65),
                0 4px 18px -6px rgba(28, 25, 23, 0.12);
              background: linear-gradient(90deg, rgba(255, 251, 235, 0.92), rgba(255, 255, 255, 0.98));
            }
          `}</style>
        </section>
      </div>
    </main>
  );
}
