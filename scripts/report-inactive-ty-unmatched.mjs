/**
 * Satışa kapalı + TY'de eşleşmeyen ürünleri listeler; olası barkod adaylarını arar.
 *   node scripts/report-inactive-ty-unmatched.mjs
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

function normKey(v) {
  return trim(v).toLocaleLowerCase("tr-TR");
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

function extractStockCode(item) {
  return trim(item?.productMainId) || trim(firstVariant(item)?.stockCode);
}

function extractQty(item) {
  if (Number.isFinite(Number(item?.quantity))) return Math.max(0, Math.trunc(Number(item.quantity)));
  const variant = firstVariant(item);
  const stock = variant?.stock;
  if (stock && typeof stock === "object" && Number.isFinite(Number(stock.quantity))) {
    return Math.max(0, Math.trunc(Number(stock.quantity)));
  }
  return 0;
}

function resolveBaseBarcode(p) {
  return trim(p.trendyol_barcode) || trim(p.trendyol_stock_code) || trim(p.sku);
}

function buildVariantBarcode(baseBarcode, sizeLabel) {
  const base = trim(baseBarcode);
  const size = trim(sizeLabel).replace(/\s+/g, "").replace(/[^a-zA-Z0-9._-]/g, "");
  if (!base || !size) return base;
  return `${base}-${size}`;
}

async function getIntegration() {
  const { data, error } = await admin
    .from("marketplace_integrations")
    .select("id,environment,seller_id,api_key,api_secret,is_active")
    .eq("marketplace", "trendyol")
    .maybeSingle();
  if (error) throw error;
  if (!data?.is_active || !data.seller_id || !data.api_key || !data.api_secret) {
    throw new Error("Trendyol entegrasyonu aktif değil.");
  }
  return data;
}

async function fetchTyCatalog(integration) {
  const base = integration.environment === "prod" ? "https://apigw.trendyol.com" : "https://stageapigw.trendyol.com";
  const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "User-Agent": `${integration.seller_id} - Zelula`,
  };
  const sellerId = encodeURIComponent(integration.seller_id);
  const all = [];
  let nextPageToken = null;
  for (let page = 0; page < 25; page += 1) {
    const qs = new URLSearchParams();
    qs.set("size", "100");
    if (nextPageToken) qs.set("nextPageToken", nextPageToken);
    else qs.set("page", String(page));
    const url = `${base}/integration/product/sellers/${sellerId}/products/approved?${qs}`;
    const res = await fetch(url, { headers });
    const text = await res.text();
    if (!res.ok) throw new Error(`TY HTTP ${res.status}`);
    const body = JSON.parse(text);
    const content = Array.isArray(body?.content) ? body.content : [];
    if (content.length === 0) break;
    all.push(...content);
    if (content.length < 100) break;
    const token = trim(body?.nextPageToken);
    if (!token) break;
    nextPageToken = token;
  }

  const stockByKey = new Map();
  const tyRows = [];
  for (const item of all) {
    const barcode = extractBarcode(item);
    const stockCode = extractStockCode(item);
    const title = trim(item?.title);
    const qty = extractQty(item);
    const row = { barcode, stockCode, title, qty, onSale: Boolean(firstVariant(item)?.onSale) };
    tyRows.push(row);
    if (barcode) stockByKey.set(barcode, row);
    if (stockCode) stockByKey.set(stockCode, row);
  }
  return { stockByKey, tyRows, fetchedCount: all.length };
}

function lookupTyStock(stockByKey, key) {
  if (!key) return null;
  return stockByKey.get(key) ?? null;
}

function sumTyForPrefix(stockByKey, baseBarcode) {
  const prefix = `${baseBarcode}-`;
  let sum = 0;
  let matched = 0;
  const keys = [];
  for (const [key, row] of stockByKey.entries()) {
    if (!key.startsWith(prefix) || key.length <= prefix.length) continue;
    sum += row.qty;
    matched += 1;
    keys.push({ key, qty: row.qty, onSale: row.onSale });
  }
  if (matched === 0) return null;
  return { raw: sum, matchedVariants: matched, keys };
}

function resolveTyStockForProduct(p, variants, stockByKey) {
  const base = resolveBaseBarcode(p);
  if (!base) return { tyStock: null, method: "no_barcode" };

  const activeVariants = (variants ?? []).filter((v) => v.is_active !== false && trim(v.label));
  if (activeVariants.length > 0) {
    let sum = 0;
    let hits = 0;
    for (const v of activeVariants) {
      const label = trim(v.label);
      const keys = [
        buildVariantBarcode(base, label),
        trim(p.trendyol_stock_code) ? `${trim(p.trendyol_stock_code)}-${label}` : "",
        trim(p.sku) ? `${trim(p.sku)}-${label}` : "",
      ].filter(Boolean);
      for (const k of keys) {
        const row = lookupTyStock(stockByKey, k);
        if (row) {
          sum += row.qty;
          hits += 1;
          break;
        }
      }
    }
    if (hits > 0) return { tyStock: sum, method: "variant_sum", base };
  }

  for (const key of [trim(p.trendyol_barcode), trim(p.trendyol_stock_code), trim(p.sku)].filter(Boolean)) {
    const row = lookupTyStock(stockByKey, key);
    if (row) return { tyStock: row.qty, method: "direct", matchKey: key, base };
  }

  const prefixSum = sumTyForPrefix(stockByKey, base);
  if (prefixSum) return { tyStock: prefixSum.raw, method: "prefix_sum", base, prefixKeys: prefixSum.keys };

  return { tyStock: null, method: "not_found", base };
}

function findTyCandidates(p, tyRows) {
  const needles = [trim(p.trendyol_barcode), trim(p.trendyol_stock_code), trim(p.sku)]
    .filter(Boolean)
    .map(normKey);
  if (needles.length === 0) return [];

  const out = [];
  for (const ty of tyRows) {
    const hay = [ty.barcode, ty.stockCode, ty.title].map(normKey).filter(Boolean);
    let score = 0;
    let reason = "";
    for (const n of needles) {
      if (!n || n.length < 3) continue;
      for (const h of hay) {
        if (h === n) {
          score = 100;
          reason = "exact_key";
          break;
        }
        if (h.includes(n) || n.includes(h)) {
          score = Math.max(score, 70);
          reason = "substring";
        }
      }
      if (score === 100) break;
    }
    if (score > 0) out.push({ ...ty, score, reason });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}

async function fetchVariantsByProduct(productIds) {
  const map = new Map();
  const chunkSize = 100;
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize);
    const { data } = await admin
      .from("product_variants")
      .select("id,product_id,label,stock_quantity,is_active")
      .in("product_id", chunk);
    for (const v of data ?? []) {
      const pid = trim(v.product_id);
      if (!pid) continue;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid).push(v);
    }
  }
  return map;
}

const integration = await getIntegration();
const { stockByKey, tyRows, fetchedCount } = await fetchTyCatalog(integration);

const { data: products } = await admin
  .from("products")
  .select("id,name,sku,stock_quantity,trendyol_barcode,trendyol_stock_code,trendyol_active,is_active")
  .eq("is_active", false);

const variantsByProduct = await fetchVariantsByProduct((products ?? []).map((p) => p.id));

const unmatched = [];
for (const p of products ?? []) {
  const resolved = resolveTyStockForProduct(p, variantsByProduct.get(p.id), stockByKey);
  if (resolved.tyStock != null) continue;
  const candidates = findTyCandidates(p, tyRows);
  unmatched.push({
    sku: p.sku,
    name: trim(p.name),
    dbStock: Math.max(0, Math.trunc(Number(p.stock_quantity ?? 0))),
    trendyol_active: p.trendyol_active,
    trendyol_barcode: trim(p.trendyol_barcode) || null,
    trendyol_stock_code: trim(p.trendyol_stock_code) || null,
    reason: resolved.method,
    candidates,
  });
}

unmatched.sort((a, b) => b.dbStock - a.dbStock);

console.log(`TY katalog: ${fetchedCount} ürün`);
console.log(`Eşleşmeyen satışa kapalı ürün: ${unmatched.length}\n`);

const withStock = unmatched.filter((u) => u.dbStock > 0);
const withCandidates = unmatched.filter((u) => u.candidates.length > 0);

console.log(`Stoklu eşleşmeyen: ${withStock.length}`);
console.log(`Olası TY adayı bulunan: ${withCandidates.length}\n`);

for (const u of unmatched) {
  console.log("---");
  console.log(`${u.sku} | DB stok=${u.dbStock} | TY kanal=${u.trendyol_active ? "açık" : "kapalı"}`);
  console.log(`  ${u.name.slice(0, 90)}`);
  console.log(`  DB barkod: ${u.trendyol_barcode ?? "—"} | stok kodu: ${u.trendyol_stock_code ?? "—"}`);
  if (u.candidates.length === 0) {
    console.log("  TY adayı: yok (muhtemelen TY'de listelenmiyor)");
  } else {
    console.log("  Olası TY eşleşmeleri:");
    for (const c of u.candidates) {
      console.log(
        `    [${c.reason}] barkod=${c.barcode} stokKodu=${c.stockCode} qty=${c.qty} onSale=${c.onSale} | ${c.title.slice(0, 70)}`,
      );
    }
  }
}

console.log("\n=== ÖZET SKU LİSTESİ ===");
console.log(unmatched.map((u) => u.sku).join(", "));
