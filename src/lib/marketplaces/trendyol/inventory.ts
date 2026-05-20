import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getActiveTrendyolIntegration,
  logMarketplaceSync,
  trendyolHasCredentials,
  isTrendyolTransientHttpStatus,
  trendyolRequest,
  TrendyolRequestError,
} from "@/lib/marketplaces/trendyol/client";

type InventoryProduct = {
  id: string;
  sku: string;
  is_active: boolean;
  trendyol_active: boolean;
  stock_quantity: number;
  price: number;
  trendyol_barcode: string | null;
  trendyol_stock_code: string | null;
  trendyol_sale_price: number | null;
  trendyol_list_price: number | null;
  trendyol_quantity: number | null;
};

function mapPriceInventoryItem(p: InventoryProduct) {
  const salePrice = Number(p.trendyol_sale_price ?? 0);
  const listPrice = Number(p.trendyol_list_price ?? p.trendyol_sale_price ?? 0);
  return {
    barcode: p.trendyol_barcode?.trim() || p.sku,
    quantity: p.stock_quantity,
    salePrice,
    listPrice,
  };
}

export type SyncPriceInventoryOptions = {
  /** Varsayılan: 0, 2500, 5000 ms. Form gönderiminde kısa tutulur. */
  retryDelaysMs?: number[];
  requestTimeoutMs?: number;
};

export async function syncPriceInventoryForProducts(
  admin: SupabaseClient,
  productIds: string[],
  reason = "manual",
  opts?: SyncPriceInventoryOptions,
) {
  if (productIds.length === 0) return { ok: true as const, skipped: true, count: 0 };
  const integration = await getActiveTrendyolIntegration(admin);
  const { data: products } = await admin
    .from("products")
    .select(
      "id,sku,is_active,trendyol_active,stock_quantity,price,trendyol_barcode,trendyol_stock_code,trendyol_sale_price,trendyol_list_price,trendyol_quantity",
    )
    .in("id", productIds);
  const eligible = ((products ?? []) as InventoryProduct[]).filter((p) => p.trendyol_active);
  if (!integration || !trendyolHasCredentials(integration)) {
    await logMarketplaceSync(admin, {
      integrationId: integration?.id ?? null,
      entityType: "inventory",
      action: "price_inventory_sync",
      status: "skipped",
      message: `Credentials missing. ${eligible.length} ürün için sync atlandı.`,
      requestPayload: { productIds, reason },
    });
    return { ok: true as const, skipped: true, count: eligible.length };
  }
  if (eligible.length === 0) {
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "inventory",
      action: "price_inventory_sync",
      status: "skipped",
      message: "Aktif ve Trendyol'a açık ürün bulunamadı.",
    });
    return { ok: true as const, skipped: true, count: 0 };
  }

  const payload = {
    items: eligible.map(mapPriceInventoryItem),
  };
  const supplierId = integration.supplier_id || integration.seller_id;
  const requestTimeoutMs = opts?.requestTimeoutMs ?? 14_000;
  const postPriceInventory = () =>
    trendyolRequest<{ batchRequestId?: string }>({
      integration,
      method: "POST",
      path: `/suppliers/${supplierId}/products/price-and-inventory`,
      body: payload,
      timeoutMs: requestTimeoutMs,
    });

  const retryDelaysMs = opts?.retryDelaysMs ?? [0, 2500, 5000];

  try {
    let response: { batchRequestId?: string } | undefined;
    let lastError: unknown;
    for (let attempt = 0; attempt < retryDelaysMs.length; attempt++) {
      if (retryDelaysMs[attempt] > 0) {
        await new Promise((r) => setTimeout(r, retryDelaysMs[attempt]));
      }
      try {
        response = await postPriceInventory();
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        const retryable = err instanceof TrendyolRequestError && isTrendyolTransientHttpStatus(err.meta.status);
        if (!retryable || attempt === retryDelaysMs.length - 1) {
          throw err;
        }
      }
    }
    if (!response) throw lastError ?? new Error("price-and-inventory: yanıt alınamadı");
    const now = new Date().toISOString();
    await Promise.all(
      eligible.map((p) =>
        admin.from("marketplace_product_links").upsert(
          {
            integration_id: integration.id,
            marketplace: "trendyol",
            product_id: p.id,
            barcode: p.trendyol_barcode ?? p.sku,
            stock_code: p.trendyol_stock_code ?? p.sku,
            status: "pending",
            batch_request_id: response.batchRequestId ?? null,
            last_payload: payload,
            last_synced_at: now,
            updated_at: now,
          },
          { onConflict: "integration_id,product_id" },
        ),
      ),
    );
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "inventory",
      action: "price_inventory_sync",
      status: "pending",
      message: `${eligible.length} ürün için fiyat/stok batch gönderildi.`,
      batchRequestId: response.batchRequestId ?? null,
      requestPayload: { reason, count: eligible.length },
      responsePayload: response,
    });
    return { ok: true as const, batchRequestId: response.batchRequestId ?? null, count: eligible.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Price/inventory sync failed";
    const transient =
      error instanceof TrendyolRequestError && isTrendyolTransientHttpStatus(error.meta.status);
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "inventory",
      action: "price_inventory_sync",
      status: "error",
      message,
      requestPayload: { reason, count: eligible.length },
    });
    return { ok: false as const, message, transient };
  }
}
