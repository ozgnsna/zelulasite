import type { SupabaseClient } from "@supabase/supabase-js";

export type TrendyolEnvironment = "stage" | "prod";

export type TrendyolIntegration = {
  id: string;
  environment: TrendyolEnvironment;
  seller_id: string | null;
  supplier_id: string | null;
  api_key: string | null;
  api_secret: string | null;
  is_active: boolean;
};

export type MarketplaceLogParams = {
  integrationId?: string | null;
  entityType: "integration" | "product" | "inventory" | "order" | "import" | "batch" | "category";
  entityId?: string | null;
  action: string;
  status: "success" | "error" | "skipped" | "pending";
  message: string;
  batchRequestId?: string | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
  /** Structured extras (e.g. parsed batch line items); keep raw API on responsePayload. */
  metadata?: unknown;
};

const TRENDYOL_BASE_URL: Record<TrendyolEnvironment, string> = {
  stage: "https://stageapigw.trendyol.com",
  prod: "https://apigw.trendyol.com",
};

type TrendyolResponseType = "ok" | "cloudflare_block" | "api_error";

type TrendyolResponseMeta = {
  endpoint: string;
  status: number;
  contentType: string;
  responseType: TrendyolResponseType;
  rayId: string | null;
  bodyFirst500: string;
};

export class TrendyolRequestError extends Error {
  meta: TrendyolResponseMeta;
  payload: unknown;

  constructor(message: string, meta: TrendyolResponseMeta, payload: unknown) {
    super(message);
    this.name = "TrendyolRequestError";
    this.meta = meta;
    this.payload = payload;
  }
}

function parseRayId(text: string) {
  const m = text.match(/cloudflare ray id:\s*([0-9a-f]{8,32})/i) ?? text.match(/ray id:\s*([0-9a-f]{8,32})/i);
  return m?.[1] ?? null;
}

function classifyTrendyolResponse(contentType: string, bodyText: string): TrendyolResponseType {
  const lower = bodyText.toLowerCase();
  const isHtml = contentType.toLowerCase().includes("text/html") || lower.includes("<!doctype html");
  if (isHtml && (lower.includes("cloudflare") || lower.includes("sorry, you have been blocked"))) {
    return "cloudflare_block";
  }
  if (isHtml) return "api_error";
  return "ok";
}

function buildResponseMeta(endpoint: string, status: number, contentType: string, bodyText: string): TrendyolResponseMeta {
  return {
    endpoint,
    status,
    contentType,
    responseType: classifyTrendyolResponse(contentType, bodyText),
    rayId: parseRayId(bodyText),
    bodyFirst500: bodyText.slice(0, 500),
  };
}

function pathnameFromEndpoint(endpoint: string): string {
  try {
    return new URL(endpoint).pathname;
  } catch {
    return endpoint;
  }
}

function stripHtmlToPlain(html: string, maxLen: number): string {
  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, maxLen);
}

/** JSON veya HTML gövdeden kısa bir hata metni çıkarır (UI ve log için). */
export function summarizeTrendyolResponseBody(
  payload: unknown,
  rawText: string,
  responseType: TrendyolResponseType,
): string {
  if (payload != null && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    for (const k of ["message", "errorMessage", "error_message", "errorDescription", "title", "detail"]) {
      const v = o[k];
      if (typeof v === "string" && v.trim()) return v.trim().slice(0, 500);
    }
    if (Array.isArray(o.errors) && o.errors.length > 0) {
      try {
        const s = JSON.stringify(o.errors.slice(0, 5));
        return s.length > 500 ? `${s.slice(0, 500)}…` : s;
      } catch {
        return String(o.errors[0]).slice(0, 500);
      }
    }
    try {
      const s = JSON.stringify(o);
      return s.length > 400 ? `${s.slice(0, 400)}…` : s;
    } catch {
      /* fall through */
    }
  }

  if (responseType === "api_error" || rawText.trim().startsWith("<")) {
    const plain = stripHtmlToPlain(rawText, 380);
    if (plain) return plain;
  }
  return rawText.replace(/\s+/g, " ").trim().slice(0, 400);
}

/** Trendyol veya ara CDN’de sık görülen geçici kapasite / bakım benzeri kodlar. */
export function isTrendyolTransientHttpStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 520 ||
    status === 522 ||
    status === 556
  );
}

function transientTrendyolHint(status: number, detail: string): string | null {
  if (isTrendyolTransientHttpStatus(status)) {
    return "Bu genelde Trendyol tarafında geçici bir yoğunluk veya bakım kaynaklıdır; birkaç dakika sonra tekrar deneyin.";
  }
  const d = detail.toLowerCase();
  if (/service unavailable|temporarily unavailable|gateway timeout|bad gateway|try again later/.test(d)) {
    return "Yanıt geçici hizmet dışı gibi görünüyor; kısa süre sonra tekrar deneyin.";
  }
  return null;
}

function buildTrendyolFailureMessage(
  responseMeta: TrendyolResponseMeta,
  parsed: unknown,
  rawText: string,
  httpOk: boolean,
): string {
  const path = pathnameFromEndpoint(responseMeta.endpoint);
  const detail = summarizeTrendyolResponseBody(parsed, rawText, responseMeta.responseType);
  const head =
    responseMeta.responseType === "cloudflare_block"
      ? "Trendyol erişim engeli (Cloudflare)"
      : !httpOk
        ? `Trendyol HTTP ${responseMeta.status}`
        : "Trendyol yanıtı beklenmeyen biçimde (HTML veya bozuk içerik)";
  const hint = transientTrendyolHint(responseMeta.status, detail);
  const detailForMsg =
    hint && /service unavailable/i.test(detail) ? detail.replace(/\bservice unavailable\b\.?/gi, "").replace(/\s+/g, " ").trim() : detail;
  let msg = `${head} — ${path}. ${detailForMsg}`.replace(/\s+/g, " ").trim();
  if (responseMeta.rayId) msg += ` Ray ID: ${responseMeta.rayId}`;
  if (hint) msg = `${msg} ${hint}`;
  return msg.slice(0, 900);
}

export function buildTrendyolCurlDebugCommand(input: {
  environment: TrendyolEnvironment;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  method?: "GET" | "POST" | "PUT";
  path: string;
  body?: unknown;
}) {
  const method = input.method ?? "GET";
  const baseUrl = TRENDYOL_BASE_URL[input.environment];
  const fullPath = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const endpoint = `${baseUrl}${fullPath}`;
  const body =
    input.body == null
      ? ""
      : ` --data '${JSON.stringify(input.body).replace(/'/g, "'\"'\"'")}'`;
  return `curl -X ${method} "${endpoint}" -u "${input.apiKey}:${input.apiSecret}" -H "User-Agent: ${input.sellerId} - Self Integration" -H "Accept: application/json" -H "Content-Type: application/json"${body}`;
}

export function trendyolHasCredentials(integration: TrendyolIntegration | null) {
  if (!integration) return false;
  return Boolean(
    integration.is_active &&
      integration.seller_id?.trim() &&
      integration.api_key?.trim() &&
      integration.api_secret?.trim(),
  );
}

export async function getActiveTrendyolIntegration(
  admin: SupabaseClient,
): Promise<TrendyolIntegration | null> {
  const { data } = await admin
    .from("marketplace_integrations")
    .select("id,environment,seller_id,supplier_id,api_key,api_secret,is_active")
    .eq("marketplace", "trendyol")
    .maybeSingle();
  if (!data) return null;
  return data as TrendyolIntegration;
}

export async function logMarketplaceSync(admin: SupabaseClient, params: MarketplaceLogParams) {
  await admin.from("marketplace_sync_logs").insert({
    integration_id: params.integrationId ?? null,
    marketplace: "trendyol",
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    action: params.action,
    status: params.status,
    message: params.message,
    batch_request_id: params.batchRequestId ?? null,
    request_payload: params.requestPayload ?? null,
    response_payload: params.responsePayload ?? null,
    metadata: params.metadata ?? null,
  });
}

type TrendyolRequest = {
  integration: TrendyolIntegration;
  method?: "GET" | "POST" | "PUT";
  path: string;
  body?: unknown;
  /** Merged into request headers (e.g. storeFrontCode, Accept-Language). */
  headers?: Record<string, string>;
};

export async function trendyolRequest<T>({
  integration,
  method = "GET",
  path,
  body,
  headers: extraHeaders,
}: TrendyolRequest): Promise<T> {
  if (!trendyolHasCredentials(integration)) {
    throw new Error("Trendyol credentials missing or integration inactive.");
  }
  const sellerId = integration.seller_id?.trim();
  if (!sellerId) {
    throw new Error("Trendyol seller_id is required.");
  }
  const baseUrl = TRENDYOL_BASE_URL[integration.environment];
  const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
  const fullPath = path.startsWith("/") ? path : `/${path}`;
  const endpoint = `${baseUrl}${fullPath}`;
  const res = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": `${sellerId} - Self Integration`,
      ...(extraHeaders ?? {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "";
  const responseMeta = buildResponseMeta(endpoint, res.status, contentType, text);
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  if (!res.ok || responseMeta.responseType !== "ok") {
    const msg = buildTrendyolFailureMessage(responseMeta, parsed, text, res.ok);
    throw new TrendyolRequestError(msg, responseMeta, parsed);
  }
  return parsed as T;
}
