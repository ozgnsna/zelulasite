import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getActiveTrendyolIntegration,
  logMarketplaceSync,
  trendyolHasCredentials,
  trendyolRequest,
} from "@/lib/marketplaces/trendyol/client";
import { syncPriceInventoryForProducts } from "@/lib/marketplaces/trendyol/inventory";
import { isTrendyolPlaceholderStockCode } from "@/lib/marketplaces/trendyol/product-identifiers";
import {
  buildTrendyolIdentifierToProductIdMap,
  resolveProductIdForTrendyolIdentifiers,
} from "@/lib/marketplaces/trendyol/product-lookup";

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

export type OrderStockOutcome = {
  applied: boolean;
  error?: string | null;
  unmatchedLines: number;
};

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

function lineStockCodeForMatch(stockCode: string) {
  return isTrendyolPlaceholderStockCode(stockCode) ? "" : stockCode;
}

type ApplyStockDeltaResult = {
  updatedProductIds: string[];
  unmatchedUnits: number;
  unmatchedOrderItems: number;
  orderOutcomes: Map<string, OrderStockOutcome>;
};

async function applyTrendyolOrderStockDelta(
  admin: SupabaseClient,
  orders: TrendyolOrderStub[],
  mode: "deduct" | "restore",
): Promise<ApplyStockDeltaResult> {
  const orderOutcomes = new Map<string, OrderStockOutcome>();
  for (const order of orders) {
    orderOutcomes.set(order.orderNumber, { applied: false, unmatchedLines: 0, error: null });
  }

  const allIdentifiers = new Set<string>();
  for (const order of orders) {
    for (const line of order.lines) {
      const barcode = String(line.barcode ?? "").trim();
      const stockCode = lineStockCodeForMatch(String(line.stockCode ?? "").trim());
      if (barcode) allIdentifiers.add(barcode);
      if (stockCode) allIdentifiers.add(stockCode);
    }
  }
  const keys = [...allIdentifiers];
  if (keys.length === 0) {
    return { updatedProductIds: [], unmatchedUnits: 0, unmatchedOrderItems: 0, orderOutcomes };
  }

  const [byBarcode, byStockCode, bySku] = await Promise.all([
    admin.from("products").select("id,stock_quantity,trendyol_barcode,trendyol_stock_code,sku,trendyol_active,is_active").in("trendyol_barcode", keys),
    admin.from("products").select("id,stock_quantity,trendyol_barcode,trendyol_stock_code,sku,trendyol_active,is_active").in("trendyol_stock_code", keys),
    admin.from("products").select("id,stock_quantity,trendyol_barcode,trendyol_stock_code,sku,trendyol_active,is_active").in("sku", keys),
  ]);

  const merged = [...(byBarcode.data ?? []), ...(byStockCode.data ?? []), ...(bySku.data ?? [])];
  const byIdentifier = buildTrendyolIdentifierToProductIdMap(
    merged as Array<{
      id: string;
      trendyol_barcode: string | null;
      trendyol_stock_code: string | null;
      sku: string | null;
    }>,
  );
  const byId = new Map<string, { id: string; stock_quantity: number; consumed: number }>();
  for (const row of merged as Array<Record<string, unknown>>) {
    const id = String(row.id ?? "").trim();
    if (!id || byId.has(id)) continue;
    byId.set(id, {
      id,
      stock_quantity: Number(row.stock_quantity ?? 0),
      consumed: 0,
    });
  }

  const productIdsByOrder = new Map<string, Set<string>>();
  let unmatchedUnits = 0;
  let unmatchedOrderItems = 0;

  for (const order of orders) {
    const orderProductIds = new Set<string>();
    for (const line of order.lines) {
      const qty = Number(line.quantity ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const matchId = resolveProductIdForTrendyolIdentifiers(
        byIdentifier,
        line.barcode,
        lineStockCodeForMatch(line.stockCode),
      );
      if (!matchId) {
        unmatchedUnits += qty;
        unmatchedOrderItems += 1;
        const outcome = orderOutcomes.get(order.orderNumber)!;
        outcome.unmatchedLines += 1;
        continue;
      }
      orderProductIds.add(matchId);
      const current = byId.get(matchId);
      if (!current) continue;
      current.consumed += qty;
    }
    productIdsByOrder.set(order.orderNumber, orderProductIds);
  }

  const updatedProductIds: string[] = [];
  const failedProductIds = new Set<string>();

  for (const row of byId.values()) {
    if (row.consumed <= 0) continue;
    const next = mode === "deduct" ? Math.max(0, row.stock_quantity - row.consumed) : row.stock_quantity + row.consumed;
    const { error } = await admin.from("products").update({ stock_quantity: next, is_active: next > 0 }).eq("id", row.id);
    if (error) {
      failedProductIds.add(row.id);
      for (const [orderNumber, pids] of productIdsByOrder) {
        if (!pids.has(row.id)) continue;
        const outcome = orderOutcomes.get(orderNumber)!;
        outcome.applied = false;
        outcome.error = error.message;
      }
      continue;
    }
    updatedProductIds.push(row.id);
  }

  for (const order of orders) {
    const outcome = orderOutcomes.get(order.orderNumber)!;
    if (outcome.unmatchedLines > 0) {
      outcome.applied = false;
      if (!outcome.error) outcome.error = "Sipariş satırında ürün eşleşmedi.";
      continue;
    }
    const pids = productIdsByOrder.get(order.orderNumber) ?? new Set<string>();
    if (pids.size === 0) {
      outcome.applied = false;
      continue;
    }
    const anyFailed = [...pids].some((id) => failedProductIds.has(id));
    if (anyFailed) {
      outcome.applied = false;
      continue;
    }
    const anyUpdated = [...pids].some((id) => updatedProductIds.includes(id));
    outcome.applied = anyUpdated;
    if (!anyUpdated) outcome.error = "Stok güncellemesi yapılmadı.";
  }

  if (updatedProductIds.length > 0) {
    await syncPriceInventoryForProducts(
      admin,
      updatedProductIds,
      mode === "deduct" ? "trendyol_order_deduct" : "trendyol_order_restore",
    );
  }

  return {
    updatedProductIds,
    unmatchedUnits,
    unmatchedOrderItems,
    orderOutcomes,
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
  const sellerId = integration.seller_id;
  const query =
    `page=0&size=50` +
    `&startDate=${start.getTime()}` +
    `&endDate=${end.getTime()}`;

  try {
    const response = await trendyolRequest<{ content?: Array<Record<string, unknown>> }>({
      integration,
      method: "GET",
      path: `/integration/order/sellers/${encodeURIComponent(sellerId!)}/orders?${query}`,
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

    type PendingOrder = {
      order: TrendyolOrderStub;
      shouldDeduct: boolean;
      shouldRestore: boolean;
      prevStatus: string;
      prevDeducted: boolean;
      effect: StockEffect;
    };
    const pending: PendingOrder[] = [];

    for (const order of orders) {
      const prev = existingById.get(order.orderNumber);
      const prevStatus = prev?.status ?? "";
      const prevDeducted = readWasDeducted(prev?.raw, prevStatus);
      const effect = decideStockEffect(order.shipmentPackageStatus);
      const shouldDeduct = effect === "deduct" && !prevDeducted;
      const shouldRestore = effect === "restore" && prevDeducted;
      if (!shouldDeduct && !shouldRestore && prev) duplicateSkipped += 1;

      if (shouldDeduct) deductOrders.push(order);
      if (shouldRestore) restoreOrders.push(order);
      pending.push({ order, shouldDeduct, shouldRestore, prevStatus, prevDeducted, effect });
    }

    const deductResult =
      deductOrders.length > 0
        ? await applyTrendyolOrderStockDelta(admin, deductOrders, "deduct")
        : { updatedProductIds: [] as string[], unmatchedUnits: 0, unmatchedOrderItems: 0, orderOutcomes: new Map() };
    const restoreResult =
      restoreOrders.length > 0
        ? await applyTrendyolOrderStockDelta(admin, restoreOrders, "restore")
        : { updatedProductIds: [] as string[], unmatchedUnits: 0, unmatchedOrderItems: 0, orderOutcomes: new Map() };

    for (const item of pending) {
      const { order, shouldDeduct, shouldRestore, prevStatus, prevDeducted, effect } = item;
      const outcome = shouldDeduct
        ? deductResult.orderOutcomes.get(order.orderNumber)
        : shouldRestore
          ? restoreResult.orderOutcomes.get(order.orderNumber)
          : undefined;

      let applied = prevDeducted;
      let lastMode: "deduct" | "restore" | "none" = "none";
      let error: string | null = null;
      let unmatchedLines = 0;

      if (shouldDeduct && outcome) {
        applied = outcome.applied;
        lastMode = "deduct";
        error = outcome.error ?? null;
        unmatchedLines = outcome.unmatchedLines;
      } else if (shouldRestore && outcome) {
        applied = outcome.applied ? false : prevDeducted;
        lastMode = "restore";
        error = outcome.error ?? null;
        unmatchedLines = outcome.unmatchedLines;
      } else if (shouldRestore) {
        applied = false;
        lastMode = "restore";
      } else if (effect === "deduct" && prevDeducted) {
        applied = true;
        lastMode = "none";
      }

      const baseRaw = parseRawPayload(order.raw);
      const rawWithMarker = {
        ...baseRaw,
        stock_effect: {
          applied,
          last_mode: lastMode,
          previous_status: prevStatus || null,
          current_status: order.shipmentPackageStatus,
          updated_at: now,
          error,
          unmatched_lines: unmatchedLines,
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
    }

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
