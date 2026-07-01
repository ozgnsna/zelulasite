/**
 * Trendyol API + stok sync tanı raporu
 *   node scripts/diagnose-trendyol-full.mjs
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
  return 0;
}

function isOnSale(item) {
  const v = firstVariant(item);
  return v ? Boolean(v.onSale) : false;
}

async function testTrendyolApi(integration) {
  const base = integration.environment === "prod" ? "https://apigw.trendyol.com" : "https://stageapigw.trendyol.com";
  const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": `${integration.seller_id} - Zelula`,
  };
  const sellerId = encodeURIComponent(integration.seller_id);
  const endpoint = `/integration/product/sellers/${sellerId}/products/approved?size=20&page=0`;
  const url = `${base}${endpoint}`;
  const res = await fetch(url, { method: "GET", headers });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  const content = Array.isArray(body?.content) ? body.content : [];
  const first = content[0] ?? null;
  return {
    ok: res.ok,
    httpStatus: res.status,
    endpoint: url,
    approvedPageCount: content.length,
    totalElements: body?.totalElements ?? null,
    sample: first
      ? {
          title: trim(first.title),
          barcode: extractBarcode(first),
          quantity: extractQty(first),
          onSale: isOnSale(first),
        }
      : null,
    errorPreview: res.ok ? null : JSON.stringify(body).slice(0, 300),
  };
}

async function fetchTyStockMap(integration) {
  const base = integration.environment === "prod" ? "https://apigw.trendyol.com" : "https://stageapigw.trendyol.com";
  const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "User-Agent": `${integration.seller_id} - Zelula`,
  };
  const sellerId = encodeURIComponent(integration.seller_id);
  const all = [];
  for (const approved of [true, null]) {
    let page = 0;
    for (;;) {
      const q = approved === true ? "approved=true&" : "";
      const url = `${base}/integration/product/sellers/${sellerId}/products?${q}size=200&page=${page}`;
      const res = await fetch(url, { headers });
      const text = await res.text();
      if (!res.ok) throw new Error(`TY products HTTP ${res.status}: ${text.slice(0, 200)}`);
      const body = JSON.parse(text);
      const content = Array.isArray(body?.content) ? body.content : [];
      all.push(...content);
      if (content.length < 200) break;
      page += 1;
      if (page > 50) break;
    }
    if (all.length > 0) break;
  }
  const stockByBarcode = new Map();
  for (const item of all) {
    const barcode = extractBarcode(item);
    if (!barcode) continue;
    const qty = extractQty(item);
    const effective = isOnSale(item) ? qty : 0;
    stockByBarcode.set(barcode, effective);
  }
  return { stockByBarcode, fetchedCount: all.length };
}

const { data: integration, error: intErr } = await admin
  .from("marketplace_integrations")
  .select("id,environment,seller_id,supplier_id,api_key,api_secret,is_active,updated_at")
  .eq("marketplace", "trendyol")
  .maybeSingle();

console.log("=== 1. Entegrasyon ===");
if (intErr) {
  console.error("DB hatası:", intErr.message);
  process.exit(1);
}
if (!integration) {
  console.log("Trendyol entegrasyon kaydı yok.");
  process.exit(0);
}
console.log(
  JSON.stringify(
    {
      is_active: integration.is_active,
      environment: integration.environment,
      seller_id: integration.seller_id,
      supplier_id: integration.supplier_id,
      has_credentials: Boolean(integration.api_key && integration.api_secret),
      updated_at: integration.updated_at,
    },
    null,
    2,
  ),
);

if (!integration.is_active || !integration.api_key || !integration.api_secret) {
  console.log("\nAPI testi atlandı: entegrasyon pasif veya kimlik bilgisi eksik.");
  process.exit(0);
}

console.log("\n=== 2. API bağlantı testi (testTrendyolProductsAccess eşdeğeri) ===");
const apiTest = await testTrendyolApi(integration);
console.log(JSON.stringify(apiTest, null, 2));

console.log("\n=== 3. marketplace_sync_logs — daily_stock_reconcile ===");
const { data: reconcileLogs } = await admin
  .from("marketplace_sync_logs")
  .select("action,status,message,created_at,response_payload")
  .eq("marketplace", "trendyol")
  .eq("action", "daily_stock_reconcile")
  .order("created_at", { ascending: false })
  .limit(15);

const lastSuccess = (reconcileLogs ?? []).find((l) => l.status === "success");
const lastError = (reconcileLogs ?? []).find((l) => l.status === "error");
const lastAny = reconcileLogs?.[0] ?? null;

console.log("Son başarılı daily_stock_reconcile:", lastSuccess ? lastSuccess.created_at : "(yok)");
if (lastSuccess) console.log("  Mesaj:", lastSuccess.message);
if (lastSuccess?.response_payload) console.log("  Payload:", JSON.stringify(lastSuccess.response_payload));

console.log("Son hatalı daily_stock_reconcile:", lastError ? lastError.created_at : "(yok)");
if (lastError) console.log("  Mesaj:", lastError.message);

console.log("En son reconcile kaydı:", lastAny ? `${lastAny.created_at} | ${lastAny.status}` : "(yok)");

console.log("\nSon 15 daily_stock_reconcile log:");
for (const l of reconcileLogs ?? []) {
  console.log(`  ${l.created_at} | ${l.status} | ${trim(l.message).slice(0, 140)}`);
}

console.log("\n=== 4. Son Trendyol sync logları (tüm action'lar, 30 kayıt) ===");
const { data: allLogs } = await admin
  .from("marketplace_sync_logs")
  .select("action,status,message,created_at")
  .eq("marketplace", "trendyol")
  .order("created_at", { ascending: false })
  .limit(30);

for (const l of allLogs ?? []) {
  console.log(`  ${l.created_at} | ${l.status} | ${l.action} | ${trim(l.message).slice(0, 100)}`);
}

if (!apiTest.ok) {
  console.log("\nStok karşılaştırması atlandı: API yanıt vermedi.");
  process.exit(0);
}

console.log("\n=== 5. Stok karşılaştırması (trendyol_active, örnek 5 ürün) ===");
const { data: dbProducts } = await admin
  .from("products")
  .select("id,name,sku,stock_quantity,trendyol_barcode,trendyol_stock_code,trendyol_active,is_active")
  .eq("trendyol_active", true)
  .limit(50);

let snapshot;
try {
  snapshot = await fetchTyStockMap(integration);
  console.log(`Trendyol'dan ${snapshot.fetchedCount} ürün satırı okundu, ${snapshot.stockByBarcode.size} barkod eşlemesi.`);
} catch (e) {
  console.error("Stok snapshot hatası:", e instanceof Error ? e.message : e);
  process.exit(1);
}

function matchTyStock(p) {
  for (const key of [p.trendyol_barcode, p.trendyol_stock_code, p.sku].map(trim).filter(Boolean)) {
    if (snapshot.stockByBarcode.has(key)) return { key, qty: snapshot.stockByBarcode.get(key) };
  }
  return null;
}

const comparisons = [];
for (const p of dbProducts ?? []) {
  const ty = matchTyStock(p);
  if (!ty) continue;
  const dbQty = Math.max(0, Math.trunc(Number(p.stock_quantity ?? 0)));
  comparisons.push({
    name: trim(p.name).slice(0, 50),
    sku: p.sku,
    barcode: p.trendyol_barcode,
    db_stock: dbQty,
    trendyol_stock: ty.qty,
    match_key: ty.key,
    match: dbQty === ty.qty,
  });
  if (comparisons.length >= 5) break;
}
console.log(JSON.stringify(comparisons, null, 2));

const { count: activeTyCount } = await admin
  .from("products")
  .select("id", { count: "exact", head: true })
  .eq("trendyol_active", true);

let mismatchTotal = 0;
let matchedTotal = 0;
const { data: allActive } = await admin
  .from("products")
  .select("stock_quantity,trendyol_barcode,trendyol_stock_code,sku")
  .eq("trendyol_active", true);

for (const p of allActive ?? []) {
  const ty = matchTyStock(p);
  if (!ty) continue;
  matchedTotal += 1;
  const dbQty = Math.max(0, Math.trunc(Number(p.stock_quantity ?? 0)));
  if (dbQty !== ty.qty) mismatchTotal += 1;
}

console.log(`\nÖzet: trendyol_active=${activeTyCount ?? 0}, TY feed'de eşleşen=${matchedTotal}, stok farkı=${mismatchTotal}`);
