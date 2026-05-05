/**
 * Trendyol product batch-request response parsing (read-only).
 * API shapes vary; we normalize defensively.
 */

export type TrendyolBatchParsedItem = {
  barcode: string | null;
  stockCode: string | null;
  status: string | null;
  rawMessage: string;
  friendlyMessage: string;
  outcome: "success" | "failed" | "unknown";
};

export type TrendyolBatchParseResult = {
  items: TrendyolBatchParsedItem[];
  successfulCount: number;
  failedCount: number;
  unknownCount: number;
};

function pickStr(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

function pushMessages(parts: string[], v: unknown) {
  if (v == null) return;
  if (typeof v === "string" && v.trim()) {
    parts.push(v.trim());
    return;
  }
  if (Array.isArray(v)) {
    for (const x of v) {
      if (typeof x === "string" && x.trim()) parts.push(x.trim());
      else if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        if (o.message) pushMessages(parts, o.message);
        if (o.errorMessage) pushMessages(parts, o.errorMessage);
        if (o.reason) pushMessages(parts, o.reason);
      }
    }
    return;
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (o.message) pushMessages(parts, o.message);
    if (o.errorMessage) pushMessages(parts, o.errorMessage);
  }
}

function collectRawMessages(o: Record<string, unknown>): string {
  const parts: string[] = [];
  pushMessages(parts, o.failureReasons);
  pushMessages(parts, o.failureReason);
  pushMessages(parts, o.errorMessage);
  pushMessages(parts, o.errors);
  pushMessages(parts, o.errorMessages);
  pushMessages(parts, o.message);
  pushMessages(parts, o.rejectReason);
  pushMessages(parts, o.validationErrors);
  return [...new Set(parts)].join(" | ");
}

function deriveOutcome(status: string | null, rawMessage: string): TrendyolBatchParsedItem["outcome"] {
  const msg = rawMessage.trim();
  const st = (status ?? "").toLowerCase();
  if (msg) return "failed";
  if (/success|completed|approved|accepted|done|ok|passed|succeeded|created/.test(st)) return "success";
  if (/fail|reject|error|invalid|declined|denied|refused|warning/.test(st)) return "failed";
  return "unknown";
}

/** Map Trendyol / English noise to short Turkish copy for admins. */
export function friendlyTrendyolBatchMessage(raw: string): string {
  const s = raw.trim();
  if (!s) return "Trendyol tarafında açıklama yok.";
  const l = s.toLowerCase();

  if (
    /attribute|attributes|kategori|category|zorunlu|mandatory|required field|missing value|variant/.test(l) &&
    /(missing|invalid|wrong|empty|not found|required|eksik|hatalı|undefined|null)/.test(l)
  ) {
    return "Kategori zorunlu özellikleri eksik";
  }
  if (/(attribute|attributes|kategori|category).*(missing|invalid|required)/i.test(s)) {
    return "Kategori zorunlu özellikleri eksik";
  }
  if (/\bbarcode\b|barkod|invalid barcode|barcode.*(missing|invalid|empty)/i.test(s)) {
    return "Barkod hatalı veya eksik";
  }
  if (/\bprice\b|fiyat|listprice|saleprice|list price|sale price|pricing|amount/i.test(s)) {
    return "Fiyat bilgisi hatalı";
  }
  if (/\bbrand\b|marka|brandname|brand name/i.test(s)) {
    return "Marka bilgisi eksik";
  }
  if (/stockcode|stock code|stok kod|productmainid|main id|sku/i.test(s) && /(missing|invalid|empty|required)/i.test(s)) {
    return "Stok kodu eksik";
  }
  if (/stockcode|stok kodu/i.test(l) && !/barcode|barkod/.test(l)) {
    return "Stok kodu eksik";
  }
  if (/quantity|stok|stock|inventory/i.test(s) && /(invalid|negative|missing|required)/i.test(s)) {
    return "Stok / adet bilgisi hatalı";
  }
  if (/vat|kdv|tax/i.test(s) && /(invalid|missing)/i.test(s)) {
    return "KDV bilgisi hatalı";
  }
  if (/dimension|desi|weight/i.test(s) && /(invalid|missing)/i.test(s)) {
    return "Desi / ağırlık bilgisi hatalı";
  }
  if (/duplicate|already exists|zaten|mevcut/i.test(s)) {
    return "Bu kayıt Trendyol tarafında zaten var veya çakışıyor";
  }
  if (/unauthor|yetkis|forbidden|401|403/i.test(s)) {
    return "Yetkilendirme / API erişim sorunu";
  }

  if (s.length <= 160) return s;
  return `${s.slice(0, 157)}…`;
}

function extractItemsArray(response: unknown): unknown[] {
  if (!response || typeof response !== "object") return [];
  const r = response as Record<string, unknown>;
  const candidates = [r.items, r.item, r.results, r.content, r.data, r.productItems];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  const nested = r.body ?? r.result ?? r.payload;
  if (nested && typeof nested === "object") {
    const n = nested as Record<string, unknown>;
    if (Array.isArray(n.items)) return n.items;
  }
  return [];
}

function normalizeOne(raw: unknown): TrendyolBatchParsedItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const barcode = pickStr(o, ["barcode", "Barcode", "barCode"]);
  const stockCode = pickStr(o, [
    "stockCode",
    "stock_code",
    "StockCode",
    "productMainId",
    "productMainID",
    "merchantSku",
    "sku",
  ]);
  const status = pickStr(o, ["status", "Status", "state", "State", "itemStatus"]);
  const rawMessage = collectRawMessages(o);
  const outcome = deriveOutcome(status, rawMessage);
  const friendlyMessage = outcome === "failed" ? friendlyTrendyolBatchMessage(rawMessage) : "";
  return { barcode, stockCode, status, rawMessage, friendlyMessage, outcome };
}

/**
 * Parse Trendyol batch-request GET response into per-line outcomes and Turkish hints.
 */
export function parseTrendyolBatchErrors(response: unknown): TrendyolBatchParseResult {
  const rawList = extractItemsArray(response);
  const items: TrendyolBatchParsedItem[] = [];
  for (const row of rawList) {
    const n = normalizeOne(row);
    if (n) items.push(n);
  }
  let successfulCount = 0;
  let failedCount = 0;
  let unknownCount = 0;
  for (const i of items) {
    if (i.outcome === "success") successfulCount += 1;
    else if (i.outcome === "failed") failedCount += 1;
    else unknownCount += 1;
  }
  return { items, successfulCount, failedCount, unknownCount };
}
