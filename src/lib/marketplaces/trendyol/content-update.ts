/**
 * Trendyol onaylı ürün content güncelleme (title-only).
 * Create POST (v2/products) kullanılmaz — yalnızca content-bulk-update.
 *
 * Docs:
 * - POST …/products/content-bulk-update  { items: [{ contentId, title? }] }
 * - GET  …/products/approved?barcode=   (storeFrontCode: TR) → contentId
 * - GET  …/products/{contentId}/update-audits → TITLE QC sonucu
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTrendyolBatchErrors } from "@/lib/marketplaces/trendyol/batch-errors";
import {
  getActiveTrendyolIntegration,
  isTrendyolTransientHttpStatus,
  logMarketplaceSync,
  trendyolHasCredentials,
  trendyolRequest,
  TrendyolRequestError,
  type TrendyolIntegration,
} from "@/lib/marketplaces/trendyol/client";

const STORE_FRONT_TR = { storeFrontCode: "TR" } as const;

/** Varsayılan: anında + 2.5s + 5s (429/5xx). */
const DEFAULT_RETRY_DELAYS_MS = [0, 2500, 5000];

export type TrendyolListing = {
  contentId: number;
  title: string;
  barcode: string | null;
  onSale: boolean | null;
  quantity: number | null;
  productMainId: string | null;
};

export type TrendyolTitleUpdateAudit = {
  type: string;
  status: string;
  changedTitle: string | null;
  existingTitle: string | null;
  rejectReasons: { type?: string; reason?: string; detail?: string }[];
  completedDate: string | null;
  batchRequestId: string | null;
  requestDate: string | null;
};

export type AwaitTrendyolBatchResult =
  | {
      ok: true;
      batchRequestId: string;
      apiStatus: string;
      successfulCount: number;
      failedCount: number;
      unknownCount: number;
      items: ReturnType<typeof parseTrendyolBatchErrors>["items"];
      raw: unknown;
    }
  | {
      ok: false;
      batchRequestId: string;
      message: string;
      apiStatus?: string;
      items?: ReturnType<typeof parseTrendyolBatchErrors>["items"];
      raw?: unknown;
    };

function asTrimmedString(value: unknown): string {
  return String(value ?? "").trim();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function firstVariant(item: Record<string, unknown>): Record<string, unknown> | null {
  const variants = item.variants;
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const v = variants[0];
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function extractListingFields(item: Record<string, unknown>, fallbackBarcode: string): TrendyolListing | null {
  const contentIdRaw = item.contentId;
  const contentId =
    typeof contentIdRaw === "number" && Number.isFinite(contentIdRaw)
      ? Math.trunc(contentIdRaw)
      : typeof contentIdRaw === "string" && /^\d+$/.test(contentIdRaw.trim())
        ? Number(contentIdRaw.trim())
        : null;
  if (contentId == null || contentId <= 0) return null;

  const variant = firstVariant(item);
  const barcode =
    asTrimmedString(item.barcode) ||
    asTrimmedString(variant?.barcode) ||
    asTrimmedString(fallbackBarcode) ||
    null;

  let quantity: number | null = null;
  if (Number.isFinite(Number(item.quantity))) {
    quantity = Math.trunc(Number(item.quantity));
  } else {
    const stockObj = variant?.stock as Record<string, unknown> | undefined;
    if (stockObj && Number.isFinite(Number(stockObj.quantity))) {
      quantity = Math.trunc(Number(stockObj.quantity));
    } else if (variant && Number.isFinite(Number(variant.quantity))) {
      quantity = Math.trunc(Number(variant.quantity));
    }
  }

  let onSale: boolean | null = null;
  if (typeof item.onSale === "boolean") onSale = item.onSale;
  else if (variant && typeof variant.onSale === "boolean") onSale = variant.onSale;

  return {
    contentId,
    title: asTrimmedString(item.title),
    barcode,
    onSale,
    quantity,
    productMainId: asTrimmedString(item.productMainId) || asTrimmedString(variant?.stockCode) || null,
  };
}

async function withTrendyolRetry<T>(
  fn: () => Promise<T>,
  retryDelaysMs: number[] = DEFAULT_RETRY_DELAYS_MS,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
    if (retryDelaysMs[attempt]! > 0) await sleep(retryDelaysMs[attempt]!);
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable =
        err instanceof TrendyolRequestError && isTrendyolTransientHttpStatus(err.meta.status);
      if (!retryable || attempt === retryDelaysMs.length - 1) throw err;
    }
  }
  throw lastError ?? new Error("Trendyol isteği başarısız");
}

function requireIntegration(integration: TrendyolIntegration | null): {
  integration: TrendyolIntegration;
  sellerId: string;
} {
  if (!integration || !trendyolHasCredentials(integration)) {
    throw new Error("Trendyol credentials missing or integration inactive.");
  }
  const sellerId = asTrimmedString(integration.seller_id);
  if (!sellerId) throw new Error("Trendyol seller_id eksik.");
  return { integration, sellerId };
}

/**
 * Barkod → onaylı listing (contentId, title, onSale, quantity).
 * Canlıda `products?barcode=` HTTP 426 verdiği için yalnızca approved filter kullanılır.
 */
export async function resolveTrendyolListing(
  integration: TrendyolIntegration,
  barcode: string,
): Promise<TrendyolListing | null> {
  const bc = asTrimmedString(barcode);
  if (!bc) return null;
  const { sellerId } = requireIntegration(integration);
  const qs = new URLSearchParams({ barcode: bc, size: "5", page: "0" });
  const response = await withTrendyolRetry(() =>
    trendyolRequest<{ content?: Record<string, unknown>[] }>({
      integration,
      method: "GET",
      path: `/integration/product/sellers/${encodeURIComponent(sellerId)}/products/approved?${qs}`,
      headers: { ...STORE_FRONT_TR },
      timeoutMs: 16_000,
    }),
  );
  const list = Array.isArray(response.content) ? response.content : [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const listing = extractListingFields(raw, bc);
    if (listing) return listing;
  }
  return null;
}

/**
 * Title-only content güncelleme. description / images / attributes GÖNDERİLMEZ.
 * Create POST yoluna düşmez.
 */
export async function updateTrendyolProductContent(
  integration: TrendyolIntegration,
  input: { contentId: number; title: string },
  opts?: { admin?: SupabaseClient; productId?: string | null; retryDelaysMs?: number[] },
): Promise<{ ok: true; batchRequestId: string } | { ok: false; message: string }> {
  const title = asTrimmedString(input.title);
  const contentId = Math.trunc(Number(input.contentId));
  if (!Number.isFinite(contentId) || contentId <= 0) {
    return { ok: false, message: "contentId geçersiz." };
  }
  if (!title) {
    return { ok: false, message: "title boş." };
  }

  let sellerId: string;
  try {
    ({ sellerId } = requireIntegration(integration));
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "credentials" };
  }

  const payload = {
    items: [{ contentId, title }],
  };

  try {
    const response = await withTrendyolRetry(
      () =>
        trendyolRequest<{ batchRequestId?: string }>({
          integration,
          method: "POST",
          path: `/integration/product/sellers/${encodeURIComponent(sellerId)}/products/content-bulk-update`,
          body: payload,
          headers: { ...STORE_FRONT_TR },
          timeoutMs: 16_000,
        }),
      opts?.retryDelaysMs,
    );
    const batchRequestId = asTrimmedString(response.batchRequestId);
    if (!batchRequestId) {
      return { ok: false, message: "content-bulk-update yanıtında batchRequestId yok." };
    }
    if (opts?.admin) {
      await logMarketplaceSync(opts.admin, {
        integrationId: integration.id,
        entityType: "product",
        entityId: opts.productId ?? String(contentId),
        action: "content_title_update",
        status: "pending",
        message: `Title content-bulk-update gönderildi (contentId=${contentId}).`,
        batchRequestId,
        requestPayload: payload,
        responsePayload: response,
      });
    }
    return { ok: true, batchRequestId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "content-bulk-update failed";
    if (opts?.admin) {
      await logMarketplaceSync(opts.admin, {
        integrationId: integration.id,
        entityType: "product",
        entityId: opts.productId ?? String(contentId),
        action: "content_title_update",
        status: "error",
        message,
        requestPayload: payload,
      });
    }
    return { ok: false, message };
  }
}

function readBatchCounts(response: unknown): { itemCount: number | null; failedItemCount: number | null } {
  if (!response || typeof response !== "object") return { itemCount: null, failedItemCount: null };
  const o = response as Record<string, unknown>;
  const itemCount = Number.isFinite(Number(o.itemCount)) ? Number(o.itemCount) : null;
  const failedItemCount = Number.isFinite(Number(o.failedItemCount)) ? Number(o.failedItemCount) : null;
  return { itemCount, failedItemCount };
}

/**
 * Batch sonucunu item seviyesinde bekler. Item yokken veya belirsizken sahte OK dönmez.
 * content-bulk-update bazen COMPLETED dönerken items dizisini bir poll geciktirir — o durumda beklemeye devam eder.
 */
export async function awaitTrendyolBatch(
  integration: TrendyolIntegration,
  batchRequestId: string,
  opts?: { maxAttempts?: number; initialDelayMs?: number; pollDelayMs?: number },
): Promise<AwaitTrendyolBatchResult> {
  const id = asTrimmedString(batchRequestId);
  if (!id) {
    return { ok: false, batchRequestId: "", message: "batchRequestId yok" };
  }
  const { sellerId } = requireIntegration(integration);
  const maxAttempts = opts?.maxAttempts ?? 12;
  const initialDelayMs = opts?.initialDelayMs ?? 2500;
  const pollDelayMs = opts?.pollDelayMs ?? 1500;

  let lastRaw: unknown = null;
  let lastApiStatus = "";

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(attempt === 0 ? initialDelayMs : pollDelayMs);
    const response = await withTrendyolRetry(() =>
      trendyolRequest<unknown>({
        integration,
        method: "GET",
        path: `/integration/product/sellers/${encodeURIComponent(sellerId)}/products/batch-requests/${encodeURIComponent(id)}`,
        timeoutMs: 16_000,
      }),
    );
    lastRaw = response;
    const apiStatus =
      response && typeof response === "object" && "status" in response
        ? asTrimmedString((response as Record<string, unknown>).status)
        : "";
    lastApiStatus = apiStatus;

    if (!apiStatus || apiStatus === "IN_PROGRESS" || apiStatus === "PENDING") {
      continue;
    }

    const parsed = parseTrendyolBatchErrors(response);
    const { itemCount, failedItemCount } = readBatchCounts(response);

    // COMPLETED ama items henüz dolmamış olabilir — poll devam
    if (parsed.items.length === 0) {
      if (attempt < maxAttempts - 1) continue;
      return {
        ok: false,
        batchRequestId: id,
        message: `Batch ${apiStatus} ama item sonucu dönmedi (sahte OK yok).`,
        apiStatus,
        items: [],
        raw: response,
      };
    }

    if (parsed.failedCount > 0 || (failedItemCount != null && failedItemCount > 0)) {
      const firstFail = parsed.items.find((i) => i.outcome === "failed");
      return {
        ok: false,
        batchRequestId: id,
        message:
          firstFail?.friendlyMessage ||
          firstFail?.rawMessage ||
          `batch FAILED (failedCount=${parsed.failedCount || failedItemCount})`,
        apiStatus,
        items: parsed.items,
        raw: response,
      };
    }

    if (parsed.unknownCount > 0 || parsed.successfulCount === 0) {
      // counts net başarı diyorsa ve fail yoksa item status'lerini tekrar dene
      if (
        attempt < maxAttempts - 1 &&
        failedItemCount === 0 &&
        itemCount != null &&
        itemCount > 0 &&
        parsed.successfulCount === 0
      ) {
        continue;
      }
      return {
        ok: false,
        batchRequestId: id,
        message: `Batch ${apiStatus}: item sonucu belirsiz (success=${parsed.successfulCount}, unknown=${parsed.unknownCount}).`,
        apiStatus,
        items: parsed.items,
        raw: response,
      };
    }

    return {
      ok: true,
      batchRequestId: id,
      apiStatus,
      successfulCount: parsed.successfulCount,
      failedCount: parsed.failedCount,
      unknownCount: parsed.unknownCount,
      items: parsed.items,
      raw: response,
    };
  }

  return {
    ok: false,
    batchRequestId: id,
    message: `Batch sonucu zaman aşımı / hâlâ IN_PROGRESS (son durum: ${lastApiStatus || "?"}).`,
    apiStatus: lastApiStatus || undefined,
    raw: lastRaw ?? undefined,
  };
}

/**
 * Content update QC audit — TITLE satırlarını döner (en yeni önce).
 * Not: update-audits rate limit 100 req/min.
 */
export async function getTrendyolContentUpdateAudits(
  integration: TrendyolIntegration,
  contentId: number,
  opts?: { page?: number; size?: number },
): Promise<{ ok: true; audits: TrendyolTitleUpdateAudit[]; raw: unknown } | { ok: false; message: string }> {
  const id = Math.trunc(Number(contentId));
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, message: "contentId geçersiz." };
  }
  let sellerId: string;
  try {
    ({ sellerId } = requireIntegration(integration));
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "credentials" };
  }

  const page = opts?.page ?? 0;
  const size = opts?.size ?? 50;
  const qs = new URLSearchParams({ page: String(page), size: String(size) });

  try {
    const response = await withTrendyolRetry(() =>
      trendyolRequest<{ content?: unknown[] }>({
        integration,
        method: "GET",
        path: `/integration/product/sellers/${encodeURIComponent(sellerId)}/products/${encodeURIComponent(String(id))}/update-audits?${qs}`,
        headers: { ...STORE_FRONT_TR },
        timeoutMs: 16_000,
      }),
    );

    const audits: TrendyolTitleUpdateAudit[] = [];
    const rows = Array.isArray(response.content) ? response.content : [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const batchRequestId = asTrimmedString(o.batchRequestId) || null;
      const requestDate = asTrimmedString(o.requestDate) || null;
      const updates = Array.isArray(o.updates) ? o.updates : [];
      for (const u of updates) {
        if (!u || typeof u !== "object") continue;
        const up = u as Record<string, unknown>;
        const type = asTrimmedString(up.type).toUpperCase() || "UNKNOWN";
        if (type !== "TITLE") continue;
        const rejectRaw = Array.isArray(up.rejectReasons) ? up.rejectReasons : [];
        audits.push({
          type,
          status: asTrimmedString(up.status).toUpperCase(),
          changedTitle: asTrimmedString(up.changedTitle) || null,
          existingTitle: asTrimmedString(up.existingTitle) || null,
          rejectReasons: rejectRaw
            .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === "object"))
            .map((r) => ({
              type: asTrimmedString(r.type) || undefined,
              reason: asTrimmedString(r.reason) || undefined,
              detail: asTrimmedString(r.detail) || undefined,
            })),
          completedDate: asTrimmedString(up.completedDate) || null,
          batchRequestId,
          requestDate,
        });
      }
    }

    return { ok: true, audits, raw: response };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "update-audits failed",
    };
  }
}

/**
 * TITLE QC sonucunu bekler (SUCCESS/FAIL). RUNNING/yok iken poll eder.
 * Rate limit: çağrılar arası en az `minGapMs` (varsayılan 700ms ≈ 100/dk altında).
 */
export async function waitForTrendyolTitleAudit(
  integration: TrendyolIntegration,
  contentId: number,
  opts: {
    expectedTitle?: string;
    batchRequestId?: string;
    maxAttempts?: number;
    pollDelayMs?: number;
    minGapMs?: number;
  } = {},
): Promise<
  | { ok: true; audit: TrendyolTitleUpdateAudit }
  | { ok: false; message: string; audit: TrendyolTitleUpdateAudit | null }
> {
  const maxAttempts = opts.maxAttempts ?? 12;
  const pollDelayMs = opts.pollDelayMs ?? 5000;
  const minGapMs = opts.minGapMs ?? 700;
  const want = asTrimmedString(opts.expectedTitle);
  const batchId = asTrimmedString(opts.batchRequestId);
  let lastAudit: TrendyolTitleUpdateAudit | null = null;
  let lastCallAt = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) await sleep(pollDelayMs);
    const since = Date.now() - lastCallAt;
    if (lastCallAt > 0 && since < minGapMs) await sleep(minGapMs - since);

    const audits = await getTrendyolContentUpdateAudits(integration, contentId);
    lastCallAt = Date.now();
    if (!audits.ok) {
      if (attempt === maxAttempts - 1) {
        return { ok: false, message: audits.message, audit: lastAudit };
      }
      continue;
    }

    const match =
      (want
        ? audits.audits.find((a) => asTrimmedString(a.changedTitle) === want)
        : null) ||
      (batchId ? audits.audits.find((a) => a.batchRequestId === batchId) : null) ||
      audits.audits[0] ||
      null;
    lastAudit = match;

    if (!match) continue;
    if (match.status === "RUNNING" || match.status === "PENDING" || match.status === "IN_PROGRESS") {
      continue;
    }
    if (match.status === "SUCCESS") {
      return { ok: true, audit: match };
    }
    if (match.status === "FAIL") {
      const reason =
        match.rejectReasons[0]?.detail ||
        match.rejectReasons[0]?.reason ||
        "TITLE audit FAIL";
      return { ok: false, message: reason, audit: match };
    }
  }

  return {
    ok: false,
    message: `TITLE audit zaman aşımı (son: ${lastAudit?.status ?? "yok"}).`,
    audit: lastAudit,
  };
}

/** Convenience: aktif entegrasyonu yükleyip title-only güncelle + batch bekle + TITLE audit. */
export async function pushTrendyolTitleByBarcode(
  admin: SupabaseClient,
  barcode: string,
  title: string,
  opts?: { productId?: string | null; waitForAuditMs?: number },
): Promise<{
  ok: boolean;
  contentId?: number;
  batchRequestId?: string;
  message: string;
  listingBefore?: TrendyolListing | null;
  listingAfter?: TrendyolListing | null;
  batch?: AwaitTrendyolBatchResult;
  titleAudit?: TrendyolTitleUpdateAudit | null;
}> {
  const integration = await getActiveTrendyolIntegration(admin);
  try {
    requireIntegration(integration);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "credentials" };
  }
  const integ = integration!;

  const listingBefore = await resolveTrendyolListing(integ, barcode);
  if (!listingBefore) {
    return { ok: false, message: `TY'de listing bulunamadı (barcode=${barcode}).`, listingBefore: null };
  }

  const update = await updateTrendyolProductContent(
    integ,
    { contentId: listingBefore.contentId, title },
    { admin, productId: opts?.productId },
  );
  if (!update.ok) {
    return {
      ok: false,
      contentId: listingBefore.contentId,
      message: update.message,
      listingBefore,
    };
  }

  const batch = await awaitTrendyolBatch(integ, update.batchRequestId);
  if (!batch.ok) {
    return {
      ok: false,
      contentId: listingBefore.contentId,
      batchRequestId: update.batchRequestId,
      message: batch.message,
      listingBefore,
      batch,
    };
  }

  const auditWait = await waitForTrendyolTitleAudit(integ, listingBefore.contentId, {
    expectedTitle: title,
    batchRequestId: update.batchRequestId,
    maxAttempts: opts?.waitForAuditMs != null ? Math.max(3, Math.ceil(opts.waitForAuditMs / 5000)) : 12,
    pollDelayMs: 5000,
  });
  const titleAudit = auditWait.audit;

  let listingAfter: TrendyolListing | null = null;
  for (let t = 0; t < 4; t += 1) {
    if (t > 0) await sleep(2000);
    listingAfter = await resolveTrendyolListing(integ, barcode);
    if (listingAfter && asTrimmedString(listingAfter.title) === asTrimmedString(title)) break;
  }

  const titleMatches =
    listingAfter && asTrimmedString(listingAfter.title) === asTrimmedString(title);

  if (!auditWait.ok && titleAudit?.status === "FAIL") {
    return {
      ok: false,
      contentId: listingBefore.contentId,
      batchRequestId: update.batchRequestId,
      message: `Batch OK ama TITLE audit FAIL: ${auditWait.message}`,
      listingBefore,
      listingAfter,
      batch,
      titleAudit,
    };
  }

  if (!titleMatches) {
    return {
      ok: false,
      contentId: listingBefore.contentId,
      batchRequestId: update.batchRequestId,
      message: `Batch OK ama TY başlığı henüz eşleşmiyor (audit=${titleAudit?.status ?? "yok"}).`,
      listingBefore,
      listingAfter,
      batch,
      titleAudit,
    };
  }

  return {
    ok: true,
    contentId: listingBefore.contentId,
    batchRequestId: update.batchRequestId,
    message: `Title güncellendi (contentId=${listingBefore.contentId}, batch=${batch.apiStatus}, audit=${titleAudit?.status ?? "pending"}).`,
    listingBefore,
    listingAfter,
    batch,
    titleAudit,
  };
}
