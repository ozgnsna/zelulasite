import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getActiveTrendyolIntegration,
  logMarketplaceSync,
  trendyolHasCredentials,
  trendyolRequest,
} from "@/lib/marketplaces/trendyol/client";
import { syncPriceInventoryForProducts } from "@/lib/marketplaces/trendyol/inventory";

export type TrendyolOrderStub = {
  orderNumber: string;
  shipmentPackageStatus: string;
  lines: Array<{
    barcode: string;
    stockCode: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  raw: unknown;
};

type StockEffect = "deduct" | "restore" | "none";

const TRENDYOL_STOCK_IMPACT_STATUSES = new Set(["created", "picking", "invoiced", "shipped", "delivered", "undelivered"]);
const TRENDYOL_STOCK_CANCELLED_STATUSES = new Set(["cancelled", "canceled", "cancel", "returned", "refunded", "rejected", "unsupplied"]);

function normalizeStatus(status: string) {
  return String(status ?? "").trim().toLocaleLowerCase("en-US");
}

function decideStockEffect(status: string): StockEffect {
  const normalized = normalizeStatus(status);
  if (TRENDYOL_STOCK_CANCELLED_STATUSES.has(normalized)) return "restore";
  if (TRENDYOL_STOCK_IMPACT_STATUSES.has(normalized)) return "deduct";
  return "none";
}

function parseRawPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function readWasDeducted(raw: unknown, previousStatus: string): boolean {
  const payload = parseRawPayload(raw);
  const stockEffect = payload.stock_effect;
  if (stockEffect && typeof stockEffect === "object" && !Array.isArray(stockEffect)) {
    const applied = (stockEffect as Record<string, unknown>).applied;
    if (typeof applied === "boolean") return applied;
  }
  return decideStockEffect(previousStatus) === "deduct";
}

function extractLineIdentifiers(line: TrendyolOrderStub["lines"][number]) {
  return [line.barcode, line.stockCode].map((v) => String(v ?? "").trim()).filter(Boolean);
}

async function applyTrendyolOrderStockDelta(
  admin: SupabaseClient,
  orders: TrendyolOrderStub[],
  mode: "deduct" | "restore",
) {
  const allIdentifiers = new Set<string>();
  for (const order of orders) {
    for (const line of order.lines) {
      for (const identifier of extractLineIdentifiers(line)) allIdentifiers.add(identifier);
    }
  }
  const keys = [...allIdentifiers];
  if (keys.length === 0) {
    return { updatedProductIds: [] as string[], unmatchedUnits: 0, unmatchedOrderItems: 0 };
  }

  const [byBarcode, byStockCode, bySku] = await Promise.all([
    admin.from("products").select("id,stock_quantity,trendyol_barcode,trendyol_active,is_active").in("trendyol_barcode", keys),
    admin.from("products").select("id,stock_quantity,trendyol_stock_code,trendyol_active,is_active").in("trendyol_stock_code", keys),
    admin.from("products").select("id,stock_quantity,sku,trendyol_active,is_active").in("sku", keys),
  ]);

  const merged = [...(byBarcode.data ?? []), ...(byStockCode.data ?? []), ...(bySku.data ?? [])];
  const byIdentifier = new Map<string, string>();
  const byId = new Map<string, { id: string; stock_quantity: number; trendyol_active: boolean; consumed: number }>();
  for (const row of merged as Array<Record<string, unknown>>) {
    const id = String(row.id ?? "").trim();
    if (!id) continue;
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        stock_quantity: Number(row.stock_quantity ?? 0),
        trendyol_active: Boolean(row.trendyol_active),
        consumed: 0,
      });
    }
    const barcode = String(row.trendyol_barcode ?? "").trim();
    const stockCode = String(row.trendyol_stock_code ?? "").trim();
    const sku = String(row.sku ?? "").trim();
    if (barcode && !byIdentifier.has(barcode)) byIdentifier.set(barcode, id);
    if (stockCode && !byIdentifier.has(stockCode)) byIdentifier.set(stockCode, id);
    if (sku && !byIdentifier.has(sku)) byIdentifier.set(sku, id);
  }

  let unmatchedUnits = 0;
  let unmatchedOrderItems = 0;
  for (const order of orders) {
    for (const line of order.lines) {
      const qty = Number(line.quantity ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const matchId = extractLineIdentifiers(line)
        .map((identifier) => byIdentifier.get(identifier))
        .find(Boolean);
      if (!matchId) {
        unmatchedUnits += qty;
        unmatchedOrderItems += 1;
        continue;
      }
      const current = byId.get(matchId);
      if (!current) continue;
      current.consumed += qty;
    }
  }

  const updatedProductIds: string[] = [];
  for (const row of byId.values()) {
    if (row.consumed <= 0) continue;
    const next = mode === "deduct" ? Math.max(0, row.stock_quantity - row.consumed) : row.stock_quantity + row.consumed;
    await admin.from("products").update({ stock_quantity: next, is_active: next > 0 }).eq("id", row.id);
    updatedProductIds.push(row.id);
  }

  if (updatedProductIds.length > 0) {
    await syncPriceInventoryForProducts(admin, updatedProductIds, mode === "deduct" ? "trendyol_order_deduct" : "trendyol_order_restore");
  }

  return {
    updatedProductIds,
    unmatchedUnits,
    unmatchedOrderItems,
  };
}

export async function fetchTrendyolOrdersForSync(admin: SupabaseClient, params?: { startDate?: Date; endDate?: Date }) {
  const integration = await getActiveTrendyolIntegration(admin);
  if (!integration || !trendyolHasCredentials(integration)) {
    await logMarketplaceSync(admin, {
      integrationId: integration?.id ?? null,
      entityType: "order",
      action: "fetch_orders",
      status: "skipped",
      message: "Credentials missing. Order fetch skipped.",
    });
    return {
      ok: true as const,
      skipped: true,
      orders: [] as TrendyolOrderStub[],
      processedOrders: 0,
      updatedProducts: 0,
      unmatchedProducts: 0,
      duplicateSkipped: 0,
      restoredOrders: 0,
    };
  }

  const start = params?.startDate ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
  const end = params?.endDate ?? new Date();
  const supplierId = integration.supplier_id || integration.seller_id;
  const query =
    `page=0&size=50` +
    `&startDate=${start.getTime()}` +
    `&endDate=${end.getTime()}`;

  try {
    const response = await trendyolRequest<{ content?: Array<Record<string, unknown>> }>({
      integration,
      method: "GET",
      path: `/suppliers/${supplierId}/orders?${query}`,
    });
    const rows = response.content ?? [];
    const externalOrderIds = rows.map((row) => String(row.orderNumber ?? "").trim()).filter(Boolean);
    const { data: existingRows } = externalOrderIds.length
      ? await admin
          .from("marketplace_orders")
          .select("external_order_id,order_status,raw_payload")
          .eq("marketplace", "trendyol")
          .in("external_order_id", externalOrderIds)
      : { data: [] as Array<{ external_order_id: string; order_status: string | null; raw_payload: unknown }> };
    const existingById = new Map(
      (existingRows ?? []).map((r) => [
        String(r.external_order_id),
        { status: String(r.order_status ?? ""), raw: r.raw_payload },
      ]),
    );

    const orders: TrendyolOrderStub[] = rows.map((row) => ({
      orderNumber: String(row.orderNumber ?? ""),
      shipmentPackageStatus: String(row.status ?? "unknown"),
      lines: (((row.lines ?? []) as Array<Record<string, unknown>>).map((line) => ({
        barcode: String(line.barcode ?? ""),
        stockCode: String(line.stockCode ?? line.merchantSku ?? ""),
        productName: String(line.productName ?? ""),
        quantity: Number(line.quantity ?? 0),
        price: Number(line.price ?? 0),
      })) ?? []),
      raw: row,
    }));
    const now = new Date().toISOString();
    const deductOrders: TrendyolOrderStub[] = [];
    const restoreOrders: TrendyolOrderStub[] = [];
    let duplicateSkipped = 0;
    for (const order of orders) {
      const prev = existingById.get(order.orderNumber);
      const prevStatus = prev?.status ?? "";
      const prevDeducted = readWasDeducted(prev?.raw, prevStatus);
      const effect = decideStockEffect(order.shipmentPackageStatus);
      const shouldDeduct = effect === "deduct" && !prevDeducted;
      const shouldRestore = effect === "restore" && prevDeducted;
      const applied = shouldDeduct ? true : shouldRestore ? false : prevDeducted;
      if (!shouldDeduct && !shouldRestore && prev) duplicateSkipped += 1;

      const baseRaw = parseRawPayload(order.raw);
      const rawWithMarker = {
        ...baseRaw,
        stock_effect: {
          applied,
          last_mode: shouldDeduct ? "deduct" : shouldRestore ? "restore" : "none",
          previous_status: prevStatus || null,
          current_status: order.shipmentPackageStatus,
          updated_at: now,
        },
      };
      await admin.from("marketplace_orders").upsert(
        {
          integration_id: integration.id,
          marketplace: "trendyol",
          external_order_id: order.orderNumber,
          order_number: order.orderNumber,
          order_status: order.shipmentPackageStatus,
          raw_payload: rawWithMarker,
          updated_at: now,
        },
        { onConflict: "marketplace,external_order_id" },
      );
      if (shouldDeduct) deductOrders.push(order);
      if (shouldRestore) restoreOrders.push(order);
    }
    const deductResult =
      deductOrders.length > 0
        ? await applyTrendyolOrderStockDelta(admin, deductOrders, "deduct")
        : { updatedProductIds: [] as string[], unmatchedUnits: 0, unmatchedOrderItems: 0 };
    const restoreResult =
      restoreOrders.length > 0
        ? await applyTrendyolOrderStockDelta(admin, restoreOrders, "restore")
        : { updatedProductIds: [] as string[], unmatchedUnits: 0, unmatchedOrderItems: 0 };

    if (deductResult.unmatchedOrderItems > 0 || restoreResult.unmatchedOrderItems > 0) {
      await logMarketplaceSync(admin, {
        integrationId: integration.id,
        entityType: "order",
        action: "order_stock_unmatched",
        status: "skipped",
        message: `${deductResult.unmatchedOrderItems + restoreResult.unmatchedOrderItems} sipariş satırında ürün eşleşmedi.`,
        responsePayload: {
          deductUnmatchedOrderItems: deductResult.unmatchedOrderItems,
          restoreUnmatchedOrderItems: restoreResult.unmatchedOrderItems,
          unmatchedUnits: deductResult.unmatchedUnits + restoreResult.unmatchedUnits,
        },
      });
    }
    if (duplicateSkipped > 0) {
      await logMarketplaceSync(admin, {
        integrationId: integration.id,
        entityType: "order",
        action: "order_stock_idempotent_skip",
        status: "success",
        message: `${duplicateSkipped} Trendyol siparişi tekrar çalıştırmada atlandı.`,
      });
    }
    if (restoreOrders.length > 0) {
      await logMarketplaceSync(admin, {
        integrationId: integration.id,
        entityType: "order",
        action: "order_stock_restore",
        status: "success",
        message: `${restoreOrders.length} iptal/iade siparişi için stok geri yüklendi.`,
        responsePayload: { updatedProducts: restoreResult.updatedProductIds.length },
      });
    }
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "order",
      action: "fetch_orders",
      status: "success",
      message: `${orders.length} Trendyol sipariş kaydı çekildi.`,
      responsePayload: {
        count: orders.length,
        processedOrders: deductOrders.length + restoreOrders.length,
        updatedProducts: new Set([...deductResult.updatedProductIds, ...restoreResult.updatedProductIds]).size,
        unmatchedProducts: deductResult.unmatchedOrderItems + restoreResult.unmatchedOrderItems,
        duplicateSkipped,
        restoredOrders: restoreOrders.length,
      },
    });
    return {
      ok: true as const,
      orders,
      processedOrders: deductOrders.length + restoreOrders.length,
      updatedProducts: new Set([...deductResult.updatedProductIds, ...restoreResult.updatedProductIds]).size,
      unmatchedProducts: deductResult.unmatchedOrderItems + restoreResult.unmatchedOrderItems,
      duplicateSkipped,
      restoredOrders: restoreOrders.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order fetch failed";
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "order",
      action: "fetch_orders",
      status: "error",
      message,
    });
    return {
      ok: false as const,
      message,
      orders: [] as TrendyolOrderStub[],
      processedOrders: 0,
      updatedProducts: 0,
      unmatchedProducts: 0,
      duplicateSkipped: 0,
      restoredOrders: 0,
    };
  }
}
