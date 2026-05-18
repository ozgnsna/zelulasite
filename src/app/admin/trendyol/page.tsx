import Link from "next/link";
import { redirect } from "next/navigation";
import {
  checkTrendyolBatchStatusAction,
  fetchTrendyolOrdersAction,
  importTrendyolApprovedProductsAction,
  refreshTrendyolCategoryAttributesAction,
  saveTrendyolIntegrationSettings,
  syncReadyTrendyolProductsAction,
  syncTrendyolPriceInventoryBatch,
} from "@/app/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { TrendyolBatchParsedItem } from "@/lib/marketplaces/trendyol/batch-errors";
import {
  buildTrendyolIdentifierToProductIdMapFromIdentifiers,
  resolveProductIdForTrendyolIdentifiers,
} from "@/lib/marketplaces/trendyol/product-lookup";
import { buildCategoryReadinessFromCache, isCategoryCacheFresh } from "@/lib/marketplaces/trendyol/categories";
import { countTrendyolHttpsProductImages } from "@/lib/marketplaces/trendyol/int-ids";
import { evaluateTrendyolReadiness } from "@/lib/marketplaces/trendyol/readiness";
import { ADMIN_OPERATIONS_MAIN } from "@/lib/admin/admin-shell-layout";
import { AdminSyncLogsSection } from "@/components/admin/dashboard/AdminSyncLogsSection";
import { AdminTrendyolBrandSection } from "@/components/admin/dashboard/AdminTrendyolBrandSection";
import { AdminTrendyolImportAlert } from "@/components/admin/dashboard/AdminTrendyolImportAlert";
import { AdminTrendyolIntegrationCard } from "@/components/admin/dashboard/AdminTrendyolIntegrationCard";
import { AdminTrendyolReadinessSection } from "@/components/admin/dashboard/AdminTrendyolReadinessSection";
import { AdminTrendyolStatusBar } from "@/components/admin/dashboard/AdminTrendyolStatusBar";
import { AdminTrendyolWorkflowSteps } from "@/components/admin/dashboard/AdminTrendyolWorkflowSteps";

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
              {failedItems.slice(0, 5).map((i, idx) => {
                const productId = resolveProductIdForTrendyolIdentifiers(identifierToProductId, i.barcode, i.stockCode);
                const editHref = productId ? `/admin/products/${encodeURIComponent(productId)}/edit` : null;
                return (
                  <li key={`${i.barcode ?? ""}-${i.stockCode ?? ""}-${idx}`}>
                    <p className="font-mono text-[10px] text-stone-700">
                      Barkod: <span className="text-stone-900">{i.barcode?.trim() || "—"}</span>
                      <span className="mx-1.5 text-stone-400">·</span>
                      Stok kodu: <span className="text-stone-900">{i.stockCode?.trim() || "—"}</span>
                    </p>
                    <p className="mt-0.5">
                      <span className="text-stone-400">→</span> <span className="font-medium">{i.friendlyMessage}</span>
                    </p>
                    {editHref ? (
                      <Link
                        href={editHref}
                        className="mt-1 inline-flex rounded border border-stone-400 bg-white px-2 py-0.5 text-[10px] font-medium text-stone-800 hover:bg-stone-50"
                      >
                        Ürünü düzenle
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        <span className="shrink-0 text-[11px] text-stone-400">{new Date(String(log.created_at)).toLocaleString("tr-TR")}</span>
      </div>
    </li>
  );
}

export default async function AdminTrendyolPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    ty?: string;
    tyErr?: string;
    tyWarn?: string;
    tyOk?: string;
    tyPreview?: string;
    tyImported?: string;
    tyUpdated?: string;
    tyDeactivated?: string;
    tyMatch?: string;
    tyFetched?: string;
  }>;
}) {
  const sp = await searchParams;
  const trendyolFilter = sp.ty ?? "all";

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
  const defaultTo = new Date();
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setDate(defaultFrom.getDate() - 7);
  const from = sp.from ? new Date(sp.from) : defaultFrom;
  const to = sp.to ? new Date(sp.to) : defaultTo;
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const baseQueryParams = `from=${fromIso.slice(0, 10)}&to=${toIso.slice(0, 10)}`;

  const [productsRes, marketplaceIntegration, marketplaceLogs] = await Promise.all([
    admin.from("products").select("*, product_images(image_url)").order("created_at", { ascending: false }).limit(200),
    admin.from("marketplace_integrations").select("*").eq("marketplace", "trendyol").maybeSingle(),
    admin
      .from("marketplace_sync_logs")
      .select("*")
      .eq("marketplace", "trendyol")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const products = productsRes.data ?? [];
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
  const trendyolLogIdentifierMap = await buildTrendyolIdentifierToProductIdMapFromIdentifiers(admin, trendyolLogLookupKeys);

  const integrationId = marketplaceIntegration.data?.id as string | undefined;
  const catIdsFromProducts = [...new Set(products.map((p) => String((p as Record<string, unknown>).trendyol_category_id ?? "").trim()).filter(Boolean))];
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

  const trendyolRowsRaw = products.map((p) => {
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
        trendyol_https_image_count: countTrendyolHttpsProductImages(
          pr.product_images as { image_url?: string | null }[] | null | undefined,
        ),
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
  const linkedCount = products.filter((p) =>
    String((p as Record<string, unknown>).trendyol_barcode ?? "").trim(),
  ).length;
  const integrationRow = marketplaceIntegration.data;
  const connectionOk = Boolean(integrationRow?.is_active) && Boolean(String(integrationRow?.seller_id ?? "").trim());
  const lastLogAt = syncLogsPreview[0]?.created_at ? String(syncLogsPreview[0].created_at) : null;

  return (
    <main className={`${ADMIN_OPERATIONS_MAIN} py-8 sm:py-10 lg:py-10`}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">Pazaryeri</p>
          <h1 className="mt-1 font-serif text-3xl font-light text-stone-900">Trendyol</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-500">
            Bağlantı → içe aktarma → ürün hazırlığı → gönderim sırasıyla ilerleyin. Kartlara tıklayarak ilgili bölüme gidebilirsiniz.
          </p>
        </div>
        <Link href="/admin" className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50">
          Kontrol paneli
        </Link>
      </div>

      <AdminTrendyolImportAlert
        tyErr={sp.tyErr}
        tyWarn={sp.tyWarn}
        tyOk={sp.tyOk}
        tyPreview={sp.tyPreview}
        tyImported={sp.tyImported}
        tyUpdated={sp.tyUpdated}
        tyDeactivated={sp.tyDeactivated}
        tyMatch={sp.tyMatch}
        tyFetched={sp.tyFetched}
      />

      <AdminTrendyolStatusBar
        isActive={Boolean(integrationRow?.is_active)}
        environment={String(integrationRow?.environment ?? "stage")}
        sellerId={integrationRow?.seller_id ? String(integrationRow.seller_id) : null}
        linkedCount={linkedCount}
        readyCount={readyCount}
        missingCount={missingCount}
        lastLogAt={lastLogAt}
      />

      <AdminTrendyolWorkflowSteps connectionOk={connectionOk} readyCount={readyCount} />

      <AdminTrendyolIntegrationCard
        integration={marketplaceIntegration.data}
        saveTrendyolIntegrationSettings={saveTrendyolIntegrationSettings}
        syncTrendyolPriceInventoryBatch={syncTrendyolPriceInventoryBatch}
        fetchTrendyolOrdersAction={fetchTrendyolOrdersAction}
        importTrendyolApprovedProductsAction={importTrendyolApprovedProductsAction}
        checkTrendyolBatchStatusAction={checkTrendyolBatchStatusAction}
        logs={
          <AdminSyncLogsSection>
            {syncLogsPreview.map((l) => (
              <MarketplaceSyncLogEntry key={l.id} log={l} identifierToProductId={trendyolLogIdentifierMap} />
            ))}
          </AdminSyncLogsSection>
        }
      />

      <AdminTrendyolBrandSection />

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
    </main>
  );
}
