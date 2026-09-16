/**
 * Tek seferlik: Trendyol'dan stok OKU → yalnızca DB güncelle (TY'ye yazma yok).
 * Hedef: is_active=false ürünlerin stock_quantity değerini TY ile hizala.
 *
 * Dry-run (varsayılan):
 *   node scripts/pull-inactive-stock-from-trendyol.mjs
 *
 * Uygula:
 *   CONFIRM=YES_PULL_INACTIVE_TY_STOCK node scripts/pull-inactive-stock-from-trendyol.mjs
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

const CONFIRM = process.env.CONFIRM === "YES_PULL_INACTIVE_TY_STOCK";
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
  if (variant && Number.isFinite(Number(variant.quantity))) {
    return Math.max(0, Math.trunc(Number(variant.quantity)));
  }
  return 0;
}

function isVariantOnSale(item) {
  const variant = firstVariant(item);
  if (!variant) return false;
  return Boolean(variant.onSale);
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
    .select("id,environment,seller_id,supplier_id,api_key,api_secret,is_active")
    .eq("marketplace", "trendyol")
    .maybeSingle();
  if (error) throw error;
  if (!data?.is_active || !data.seller_id || !data.api_key || !data.api_secret) {
    throw new Error("Trendyol entegrasyonu aktif değil veya kimlik bilgisi eksik.");
  }
  return data;
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
  const size = 100;
  const maxPages = 25;
  const all = [];
  let nextPageToken = null;

  for (let page = 0; page < maxPages; page += 1) {
    const qs = new URLSearchParams();
    qs.set("size", String(size));
    if (nextPageToken) qs.set("nextPageToken", nextPageToken);
    else qs.set("page", String(page));
    const url = `${base}/integration/product/sellers/${sellerId}/products/approved?${qs}`;
    const res = await fetch(url, { headers });
    const text = await res.text();
    if (!res.ok) throw new Error(`TY products/approved HTTP ${res.status}: ${text.slice(0, 200)}`);
    const body = JSON.parse(text);
    const content = Array.isArray(body?.content) ? body.content : [];
    if (content.length === 0) break;
    all.push(...content);
    if (content.length < size) break;
    const token = trim(body?.nextPageToken);
    if (!token) break;
    nextPageToken = token;
  }

  const stockByKey = new Map();
  for (const item of all) {
    const barcode = extractBarcode(item);
    const stockCode = extractStockCode(item);
    const raw = extractQty(item);
    const onSale = isVariantOnSale(item);
    const row = { raw, onSale };
    if (barcode) stockByKey.set(barcode, row);
    if (stockCode) stockByKey.set(stockCode, row);
  }
  return { stockByKey, fetchedCount: all.length };
}

function lookupTyStock(stockByKey, key) {
  if (!key) return null;
  return stockByKey.get(key) ?? null;
}

function sumTyForPrefix(stockByKey, baseBarcode) {
  const prefix = `${baseBarcode}-`;
  let sum = 0;
  let matched = 0;
  let anyOnSale = false;
  for (const [key, row] of stockByKey.entries()) {
    if (!key.startsWith(prefix) || key.length <= prefix.length) continue;
    sum += row.raw;
    matched += 1;
    if (row.onSale) anyOnSale = true;
  }
  if (matched === 0) return null;
  return { raw: sum, onSale: anyOnSale, matchedVariants: matched };
}

function resolveTyStockForProduct(p, variants, stockByKey) {
  const base = resolveBaseBarcode(p);
  if (!base) return { tyStock: null, method: "no_barcode" };

  const activeVariants = (variants ?? []).filter((v) => v.is_active !== false && trim(v.label));

  if (activeVariants.length > 0) {
    let sum = 0;
    let hits = 0;
    let anyOnSale = false;
    const perVariant = [];
    for (const v of activeVariants) {
      const label = trim(v.label);
      const keys = [
        buildVariantBarcode(base, label),
        trim(p.trendyol_stock_code) ? `${trim(p.trendyol_stock_code)}-${label}` : "",
        trim(p.sku) ? `${trim(p.sku)}-${label}` : "",
      ].filter(Boolean);
      let found = null;
      for (const k of keys) {
        const row = lookupTyStock(stockByKey, k);
        if (row) {
          found = { key: k, ...row };
          break;
        }
      }
      if (found) {
        sum += found.raw;
        hits += 1;
        if (found.onSale) anyOnSale = true;
        perVariant.push({ variantId: v.id, label, ty: found.raw, key: found.key });
      } else {
        perVariant.push({ variantId: v.id, label, ty: null, key: null });
      }
    }
    if (hits > 0) {
      return { tyStock: sum, onSale: anyOnSale, method: "variant_sum", perVariant, base };
    }
  }

  for (const key of [trim(p.trendyol_barcode), trim(p.trendyol_stock_code), trim(p.sku)].filter(Boolean)) {
    const row = lookupTyStock(stockByKey, key);
    if (row) return { tyStock: row.raw, onSale: row.onSale, method: "direct", matchKey: key, base };
  }

  const prefixSum = sumTyForPrefix(stockByKey, base);
  if (prefixSum) {
    return {
      tyStock: prefixSum.raw,
      onSale: prefixSum.onSale,
      method: "prefix_sum",
      matchedVariants: prefixSum.matchedVariants,
      base,
    };
  }

  return { tyStock: null, method: "not_found", base };
}

async function fetchVariantsByProduct(productIds) {
  const map = new Map();
  if (productIds.length === 0) return map;
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

async function main() {
  console.log(CONFIRM ? "=== UYGULA: TY → DB stok çekimi ===" : "=== DRY-RUN: TY → DB stok çekimi ===");
  console.log("Trendyol'a yazma YOK — yalnızca okuma + DB güncelleme.\n");

  const integration = await getIntegration();
  const { stockByKey, fetchedCount } = await fetchTyStockMap(integration);
  console.log(`Trendyol'dan ${fetchedCount} ürün okundu, ${stockByKey.size} barkod/stok kodu.\n`);

  const { data: products, error } = await admin
    .from("products")
    .select("id,name,sku,stock_quantity,trendyol_barcode,trendyol_stock_code,trendyol_quantity,is_active")
    .eq("is_active", false);

  if (error) throw error;

  const variantsByProduct = await fetchVariantsByProduct((products ?? []).map((p) => p.id));

  const changes = [];
  const unchanged = [];
  const skipped = [];

  for (const p of products ?? []) {
    const dbStock = Math.max(0, Math.trunc(Number(p.stock_quantity ?? 0)));
    const resolved = resolveTyStockForProduct(p, variantsByProduct.get(p.id), stockByKey);

    if (resolved.tyStock == null) {
      skipped.push({
        id: p.id,
        sku: p.sku,
        name: trim(p.name).slice(0, 50),
        dbStock,
        reason: resolved.method,
        base: resolved.base ?? null,
      });
      continue;
    }

    const tyStock = Math.max(0, Math.trunc(resolved.tyStock));
    const row = {
      id: p.id,
      sku: p.sku,
      name: trim(p.name).slice(0, 50),
      dbStock,
      tyStock,
      delta: tyStock - dbStock,
      method: resolved.method,
      onSale: resolved.onSale ?? null,
      base: resolved.base ?? resolved.matchKey ?? null,
      perVariant: resolved.perVariant ?? null,
    };

    if (tyStock === dbStock) unchanged.push(row);
    else changes.push(row);
  }

  console.log(`Satışa kapalı ürün: ${products?.length ?? 0}`);
  console.log(`TY eşleşmesi bulunan: ${changes.length + unchanged.length}`);
  console.log(`Güncellenecek (farklı stok): ${changes.length}`);
  console.log(`Zaten uyumlu: ${unchanged.length}`);
  console.log(`TY'de bulunamayan: ${skipped.length}\n`);

  if (changes.length > 0) {
    console.log("--- Güncellenecek ürünler ---");
    for (const c of changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))) {
      console.log(
        `  ${c.sku ?? c.id}: DB=${c.dbStock} → TY=${c.tyStock} (${c.delta >= 0 ? "+" : ""}${c.delta}) [${c.method}] ${c.name}`,
      );
    }
  }

  if (skipped.length > 0 && skipped.length <= 30) {
    console.log("\n--- TY'de eşleşmeyen (stoklu olanlar) ---");
    for (const s of skipped.filter((x) => x.dbStock > 0)) {
      console.log(`  ${s.sku ?? s.id}: DB=${s.dbStock} [${s.reason}] ${s.name}`);
    }
  }

  if (!CONFIRM) {
    console.log("\nDry-run tamam. Uygulamak için:");
    console.log("  CONFIRM=YES_PULL_INACTIVE_TY_STOCK node scripts/pull-inactive-stock-from-trendyol.mjs");
    return;
  }

  if (changes.length === 0) {
    console.log("\nUygulanacak değişiklik yok.");
    return;
  }

  let updated = 0;
  let variantUpdates = 0;

  for (const c of changes) {
    const updatePayload = { stock_quantity: c.tyStock, trendyol_quantity: c.tyStock };
    let updErr = (
      await admin.from("products").update(updatePayload).eq("id", c.id)
    ).error;
    if (updErr?.message?.includes("trendyol_quantity")) {
      updErr = (await admin.from("products").update({ stock_quantity: c.tyStock }).eq("id", c.id)).error;
    }
    if (updErr) {
      console.error(`Ürün güncellenemedi ${c.sku}:`, updErr.message);
      continue;
    }
    updated += 1;

    if (Array.isArray(c.perVariant)) {
      for (const pv of c.perVariant) {
        if (pv.ty == null || !pv.variantId) continue;
        const { error: vErr } = await admin
          .from("product_variants")
          .update({ stock_quantity: pv.ty })
          .eq("id", pv.variantId);
        if (!vErr) variantUpdates += 1;
      }
    }
  }

  console.log(`\nTamam: ${updated} ürün DB stoğu güncellendi, ${variantUpdates} varyant satırı güncellendi.`);
  console.log("is_active=false korundu; Trendyol'a hiçbir istek gönderilmedi.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
