/**
 * Trendyol onSale / status araştırma raporu (gerçek API)
 *   node scripts/investigate-trendyol-onsale.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = t.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function trim(v) {
  return String(v ?? "").trim();
}

function firstVariant(item) {
  const variants = item?.variants;
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const v = variants[0];
  return v && typeof v === "object" ? v : null;
}

function extractBarcode(item) {
  return trim(item?.barcode) || trim(firstVariant(item)?.barcode);
}

function extractQty(item) {
  if (Number.isFinite(Number(item?.quantity))) return Math.max(0, Math.trunc(Number(item.quantity)));
  const stock = firstVariant(item)?.stock;
  if (stock && Number.isFinite(Number(stock.quantity))) {
    return Math.max(0, Math.trunc(Number(stock.quantity)));
  }
  const v = firstVariant(item);
  if (v && Number.isFinite(Number(v.quantity))) return Math.max(0, Math.trunc(Number(v.quantity)));
  return 0;
}

function variantOnSale(item) {
  const v = firstVariant(item);
  if (!v) return null;
  if ("onSale" in v) return Boolean(v.onSale);
  if ("onsale" in v) return Boolean(v.onsale);
  return null;
}

function collectStatusFlags(item) {
  const v = firstVariant(item) ?? {};
  const root = item ?? {};
  const keys = [
    "onSale",
    "onsale",
    "locked",
    "blacklisted",
    "archived",
    "rejected",
    "approved",
    "lockedByUnSuppliedReason",
    "hasActiveCampaign",
    "status",
  ];
  const out = {};
  for (const k of keys) {
    if (k in root) out[`root.${k}`] = root[k];
    if (k in v) out[`variant.${k}`] = v[k];
  }
  return out;
}

const { data: integration } = await admin
  .from("marketplace_integrations")
  .select("id,environment,seller_id,api_key,api_secret,is_active,updated_at")
  .eq("marketplace", "trendyol")
  .maybeSingle();

if (!integration?.is_active) {
  console.error("Trendyol entegrasyonu aktif değil.");
  process.exit(1);
}

const base = integration.environment === "prod" ? "https://apigw.trendyol.com" : "https://stageapigw.trendyol.com";
const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
const headers = {
  Authorization: `Basic ${auth}`,
  Accept: "application/json",
  "User-Agent": `${integration.seller_id} - Zelula`,
};
const sellerId = encodeURIComponent(integration.seller_id);

async function tyGet(path) {
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { headers });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { ok: res.ok, status: res.status, url, body };
}

async function countTotalElements(path) {
  const r = await tyGet(`${path}${path.includes("?") ? "&" : "?"}size=1&page=0`);
  return {
    http: r.status,
    ok: r.ok,
    totalElements: r.body?.totalElements ?? null,
    error: r.ok ? null : JSON.stringify(r.body).slice(0, 200),
  };
}

async function fetchAllApprovedV2() {
  const all = [];
  let nextPageToken = null;
  for (let page = 0; page < 50; page++) {
    const qs = new URLSearchParams({ size: "100" });
    if (nextPageToken) qs.set("nextPageToken", nextPageToken);
    else qs.set("page", String(page));
    const r = await tyGet(`/integration/product/sellers/${sellerId}/products/approved?${qs}`);
    if (!r.ok) throw new Error(`approved V2 HTTP ${r.status}: ${JSON.stringify(r.body).slice(0, 200)}`);
    const content = Array.isArray(r.body?.content) ? r.body.content : [];
    all.push(...content);
    if (content.length < 100) break;
    const token = trim(r.body?.nextPageToken);
    if (!token) break;
    nextPageToken = token;
  }
  return all;
}

async function fetchAllProductsV1(query) {
  const all = [];
  for (let page = 0; page < 50; page++) {
    const qs = new URLSearchParams({ ...query, size: "200", page: String(page) });
    const r = await tyGet(`/integration/product/sellers/${sellerId}/products?${qs}`);
    if (!r.ok) {
      return { ok: false, http: r.status, error: JSON.stringify(r.body).slice(0, 200), items: all };
    }
    const content = Array.isArray(r.body?.content) ? r.body.content : [];
    all.push(...content);
    if (content.length < 200) {
      return { ok: true, totalElements: r.body?.totalElements ?? all.length, items: all };
    }
  }
  return { ok: true, totalElements: all.length, items: all };
}

console.log("=== Entegrasyon ===");
console.log(JSON.stringify({ seller_id: integration.seller_id, updated_at: integration.updated_at }, null, 2));

console.log("\n=== 1. Endpoint varlığı (kod + dokümantasyon) ===");
const endpointChecks = {
  price_inventory: "/integration/inventory/sellers/{sellerId}/products/price-and-inventory (POST) — stok/fiyat, onSale alanı YOK",
  product_create_v2: "/integration/product/sellers/{sellerId}/v2/products (POST) — kodda syncProductToTrendyol",
  product_update_put: "/integration/product/sellers/{sellerId}/products (PUT) — dokümanda updateProduct, kodda KULLANILMIYOR",
  unlock: "/integration/product/sellers/{sellerId}/products/unlock (PUT) — kilit kaldırma, kodda KULLANILMIYOR",
  archive: "/integration/product/sellers/{sellerId}/products/archive (PUT) — arşiv, kodda KULLANILMIYOR",
  filter_onSale_v1: "/integration/product/sellers/{sellerId}/products?onSale=true — V1 filterProducts",
  approved_v2: "/integration/product/sellers/{sellerId}/products/approved — products.ts kullanıyor",
  inv_price_v2: "/integration/product/sellers/{sellerId}/products/approved/inventory-and-price?status=onSale|notOnSale|locked|blacklisted",
};
console.log(JSON.stringify(endpointChecks, null, 2));

console.log("\n=== 2. totalElements — filtre sorguları (gerçek API) ===");
const filterCounts = {};
for (const [label, path] of [
  ["approved_v2", `/integration/product/sellers/${sellerId}/products/approved`],
  ["all_products", `/integration/product/sellers/${sellerId}/products`],
  ["approved_v1", `/integration/product/sellers/${sellerId}/products?approved=true`],
  ["onSale_true_v1", `/integration/product/sellers/${sellerId}/products?approved=true&onSale=true`],
  ["onSale_false_v1", `/integration/product/sellers/${sellerId}/products?approved=true&onSale=false`],
  ["blacklisted_true", `/integration/product/sellers/${sellerId}/products?blacklisted=true`],
  ["rejected_true", `/integration/product/sellers/${sellerId}/products?rejected=true`],
  ["archived_true", `/integration/product/sellers/${sellerId}/products?archived=true`],
  ["inv_status_onSale", `/integration/product/sellers/${sellerId}/products/approved/inventory-and-price?status=onSale`],
  ["inv_status_notOnSale", `/integration/product/sellers/${sellerId}/products/approved/inventory-and-price?status=notOnSale`],
  ["inv_status_locked", `/integration/product/sellers/${sellerId}/products/approved/inventory-and-price?status=locked`],
  ["inv_status_blacklisted", `/integration/product/sellers/${sellerId}/products/approved/inventory-and-price?status=blacklisted`],
]) {
  filterCounts[label] = await countTotalElements(path);
}

console.log(JSON.stringify(filterCounts, null, 2));

console.log("\n=== 3. Approved V2 ürün durum analizi ===");
const approved = await fetchAllApprovedV2();
const tallies = {
  total: approved.length,
  variant_onSale_true: 0,
  variant_onSale_false: 0,
  variant_onSale_missing: 0,
  raw_qty_gt0: 0,
  raw_qty_gt0_onSale_true: 0,
  raw_qty_gt0_onSale_false: 0,
  variant_locked_true: 0,
  variant_locked_false: 0,
  root_keys_seen: new Set(),
  variant_keys_seen: new Set(),
};

const flagCounts = {};
function bumpFlag(obj) {
  for (const [k, v] of Object.entries(obj)) {
    const key = `${k}=${JSON.stringify(v)}`;
    flagCounts[key] = (flagCounts[key] ?? 0) + 1;
  }
}

for (const item of approved) {
  Object.keys(item ?? {}).forEach((k) => tallies.root_keys_seen.add(k));
  const v = firstVariant(item);
  if (v) Object.keys(v).forEach((k) => tallies.variant_keys_seen.add(k));

  const onSale = variantOnSale(item);
  const qty = extractQty(item);
  if (onSale === true) tallies.variant_onSale_true += 1;
  else if (onSale === false) tallies.variant_onSale_false += 1;
  else tallies.variant_onSale_missing += 1;
  if (qty > 0) {
    tallies.raw_qty_gt0 += 1;
    if (onSale === true) tallies.raw_qty_gt0_onSale_true += 1;
    if (onSale === false) tallies.raw_qty_gt0_onSale_false += 1;
  }
  if (v?.locked === true) tallies.variant_locked_true += 1;
  if (v?.locked === false) tallies.variant_locked_false += 1;
  bumpFlag(collectStatusFlags(item));
}

console.log(
  JSON.stringify(
    {
      ...tallies,
      root_keys_seen: [...tallies.root_keys_seen].sort(),
      variant_keys_seen: [...tallies.variant_keys_seen].sort(),
      top_status_flag_combos: Object.entries(flagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([k, n]) => ({ flag: k, count: n })),
      sample_product_flags: approved.slice(0, 3).map((item) => ({
        barcode: extractBarcode(item),
        title: trim(item?.title).slice(0, 50),
        qty: extractQty(item),
        flags: collectStatusFlags(item),
      })),
    },
    null,
    2,
  ),
);

console.log("\n=== 4. V1 products?approved=true — onsale/locked alanları ===");
const v1Approved = await fetchAllProductsV1({ approved: "true" });
if (v1Approved.ok) {
  let v1OnSaleTrue = 0;
  let v1OnSaleFalse = 0;
  let v1LockedTrue = 0;
  let v1QtyGt0 = 0;
  let v1QtyGt0NotOnSale = 0;
  const v1Keys = new Set();
  for (const item of v1Approved.items) {
    Object.keys(item ?? {}).forEach((k) => v1Keys.add(k));
    const onsale = item?.onsale ?? item?.onSale;
    if (onsale === true) v1OnSaleTrue += 1;
    if (onsale === false) v1OnSaleFalse += 1;
    if (item?.locked === true) v1LockedTrue += 1;
    const qty = Math.max(0, Math.trunc(Number(item?.quantity ?? 0)));
    if (qty > 0) {
      v1QtyGt0 += 1;
      if (onsale === false) v1QtyGt0NotOnSale += 1;
    }
  }
  console.log(
    JSON.stringify(
      {
        http_ok: true,
        fetched: v1Approved.items.length,
        totalElements: v1Approved.totalElements,
        onsale_true: v1OnSaleTrue,
        onsale_false: v1OnSaleFalse,
        locked_true: v1LockedTrue,
        qty_gt0: v1QtyGt0,
        qty_gt0_onsale_false: v1QtyGt0NotOnSale,
        v1_root_keys: [...v1Keys].sort(),
        sample: v1Approved.items.slice(0, 2).map((item) => ({
          barcode: item?.barcode,
          quantity: item?.quantity,
          onsale: item?.onsale ?? item?.onSale,
          locked: item?.locked,
          approved: item?.approved,
          archived: item?.archived,
          blacklisted: item?.blacklisted,
          rejected: item?.rejected,
          lastUpdateDate: item?.lastUpdateDate,
        })),
      },
      null,
      2,
    ),
  );
} else {
  console.log(JSON.stringify(v1Approved, null, 2));
}

console.log("\n=== 5. Son sync logları (marketplace_sync_logs) ===");
const { data: logs } = await admin
  .from("marketplace_sync_logs")
  .select("action,status,message,created_at,response_payload")
  .eq("marketplace", "trendyol")
  .order("created_at", { ascending: false })
  .limit(20);

const { data: logsAnyMarketplace } = await admin
  .from("marketplace_sync_logs")
  .select("marketplace,action,status,created_at")
  .order("created_at", { ascending: false })
  .limit(10);

const { data: links } = await admin
  .from("marketplace_product_links")
  .select("last_synced_at,status,updated_at")
  .eq("marketplace", "trendyol")
  .order("last_synced_at", { ascending: false, nullsFirst: false })
  .limit(5);

console.log(
  JSON.stringify(
    {
      trendyol_logs_count: logs?.length ?? 0,
      last_trendyol_logs: logs ?? [],
      last_any_marketplace_logs: logsAnyMarketplace ?? [],
      last_product_link_syncs: links ?? [],
      integration_updated_at: integration.updated_at,
    },
    null,
    2,
  ),
);

// stockLastModifiedDate from inventory-and-price for sample
console.log("\n=== 6. inventory-and-price örnek (Zelula234) ===");
const invSample = await tyGet(
  `/integration/product/sellers/${sellerId}/products/approved/inventory-and-price?barcode=Zelula234&size=1&page=0`,
);
console.log(JSON.stringify({ http: invSample.status, body: invSample.body }, null, 2));

console.log("\n=== 7. DB vs TY effective (approved V2 — products.ts ile aynı endpoint) ===");
const tyMap = new Map();
for (const item of approved) {
  const v = firstVariant(item);
  const bc = extractBarcode(item);
  if (!bc) continue;
  const qty = extractQty(item);
  const onSale = Boolean(v?.onSale);
  tyMap.set(bc, { effective: onSale ? qty : 0, raw: qty, onSale });
}
const { data: dbActive } = await admin
  .from("products")
  .select("stock_quantity,trendyol_barcode,trendyol_stock_code,sku")
  .eq("trendyol_active", true);
let matched = 0;
let mismatch = 0;
let matchedOnSaleFalse = 0;
for (const p of dbActive ?? []) {
  let ty = null;
  for (const key of [p.trendyol_barcode, p.trendyol_stock_code, p.sku].map(trim).filter(Boolean)) {
    if (tyMap.has(key)) {
      ty = tyMap.get(key);
      break;
    }
  }
  if (!ty) continue;
  matched += 1;
  if (!ty.onSale) matchedOnSaleFalse += 1;
  const dbQty = Math.max(0, Math.trunc(Number(p.stock_quantity ?? 0)));
  if (dbQty !== ty.effective) mismatch += 1;
}
console.log(
  JSON.stringify(
    {
      trendyol_active_db: (dbActive ?? []).length,
      matched_in_approved_v2: matched,
      stock_mismatch_vs_effective: mismatch,
      in_sync: matched - mismatch,
      matched_onSale_false: matchedOnSaleFalse,
    },
    null,
    2,
  ),
);

console.log("\n=== 8. diagnose script hatası: /products V1 variants.onSale okuması ===");
const v1Flat = await tyGet(`/integration/product/sellers/${sellerId}/products?approved=true&size=3&page=0`);
const v1Items = v1Flat.body?.content ?? [];
const wrongRead = v1Items.filter((item) => firstVariant(item) == null && (item.onSale === true || item.onsale === true)).length;
const v1OnSaleAtRoot = v1Items.filter((item) => item.onSale === true || item.onsale === true).length;
console.log(
  JSON.stringify(
    {
      note: "diagnose-trendyol-full.mjs /products V1 yanıtında onSale kök alanda; variants yok → isOnSale() her zaman false döner",
      v1_sample_size: v1Items.length,
      v1_onSale_true_at_root: v1OnSaleAtRoot,
      v1_items_with_variants_array: v1Items.filter((item) => Array.isArray(item.variants) && item.variants.length > 0).length,
    },
    null,
    2,
  ),
);
