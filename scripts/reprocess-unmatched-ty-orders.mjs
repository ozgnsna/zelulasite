/**
 * Unmatched Trendyol sipariş satırlarını yeni matcher ile yeniden işle.
 *
 *   node scripts/reprocess-unmatched-ty-orders.mjs           # dry-run
 *   node scripts/reprocess-unmatched-ty-orders.mjs --apply   # yazar
 *
 * Idempotent: stock_effect.applied === true ise atlanır.
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

function normalizeTrMatchToken(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function isNumericSizeSuffix(suffix) {
  return /^\d+([.,]\d+)?$/.test(String(suffix ?? "").trim());
}

function parseTrendyolColorSuffixBarcode(barcode) {
  const b = String(barcode ?? "").trim();
  const idx = b.lastIndexOf("-");
  if (idx <= 0 || idx >= b.length - 1) return null;
  const base = b.slice(0, idx).trim();
  const color = b.slice(idx + 1).trim();
  if (!base || !color) return null;
  if (isNumericSizeSuffix(color)) return null;
  return { base, color };
}

function isPlaceholderStockCode(stockCode) {
  const s = String(stockCode ?? "").trim().toLowerCase();
  return !s || s === "merchantsku" || s === "merchant_sku" || s === "sku";
}

function buildExactMap(rows) {
  const m = new Map();
  for (const r of rows) {
    for (const v of [r.trendyol_barcode, r.trendyol_stock_code, r.sku]) {
      const key = String(v ?? "").trim();
      if (key && !m.has(key)) m.set(key, r);
    }
  }
  return m;
}

function rowMatchesBase(row, base) {
  const b = base.trim();
  for (const v of [row.sku, row.trendyol_stock_code, row.trendyol_barcode]) {
    const key = String(v ?? "").trim();
    if (!key) continue;
    if (key === b || key.startsWith(`${b}-`)) return true;
  }
  return false;
}

function colorMatchesProduct(colorToken, product) {
  const want = normalizeTrMatchToken(colorToken);
  if (!want) return false;
  const field = normalizeTrMatchToken(String(product.color ?? ""));
  if (field && (field === want || field.includes(want) || want.includes(field))) return true;
  const name = normalizeTrMatchToken(String(product.name ?? ""));
  if (name && name.includes(want)) return true;
  for (const v of [product.trendyol_barcode, product.trendyol_stock_code, product.sku]) {
    const parsed = parseTrendyolColorSuffixBarcode(String(v ?? ""));
    if (parsed && normalizeTrMatchToken(parsed.color) === want) return true;
  }
  return false;
}

function resolveExact(map, barcode, stockCode) {
  const b = String(barcode ?? "").trim();
  const s = isPlaceholderStockCode(stockCode) ? "" : String(stockCode ?? "").trim();
  if (b && map.has(b)) return map.get(b);
  if (s && map.has(s)) return map.get(s);
  return null;
}

function resolveColor(allProducts, barcode) {
  const parsed = parseTrendyolColorSuffixBarcode(barcode);
  if (!parsed) return null;
  const candidates = allProducts.filter((row) => rowMatchesBase(row, parsed.base));
  const colored = candidates.filter((row) => colorMatchesProduct(parsed.color, row));
  if (colored.length === 1) return colored[0];
  return null;
}

const apply = process.argv.includes("--apply");
const lookbackDays = 30;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY gerekli");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

const { data: products, error: pErr } = await admin
  .from("products")
  .select("id,sku,name,color,stock_quantity,trendyol_barcode,trendyol_stock_code,is_active,trendyol_active");
if (pErr) throw pErr;

const exactMap = buildExactMap(products ?? []);
const allProducts = products ?? [];

const { data: orders, error: oErr } = await admin
  .from("marketplace_orders")
  .select("id,order_number,order_status,raw_payload,updated_at")
  .eq("marketplace", "trendyol")
  .gte("updated_at", since)
  .order("updated_at", { ascending: false })
  .limit(500);
if (oErr) throw oErr;

const plans = [];

for (const order of orders ?? []) {
  const effect = order.raw_payload?.stock_effect ?? {};
  const unmatchedLines = Number(effect.unmatched_lines ?? 0);
  const alreadyApplied = effect.applied === true;
  const lines = Array.isArray(order.raw_payload?.lines) ? order.raw_payload.lines : [];

  if (alreadyApplied) {
    continue;
  }
  if (unmatchedLines <= 0 && effect.error !== "Sipariş satırında ürün eşleşmedi.") {
    // Yalnızca unmatched / eşleşmeyenleri hedefle
    const anyUnmatched = lines.some((line) => {
      const barcode = String(line.barcode ?? "").trim();
      const stockCode = String(line.stockCode ?? line.merchantSku ?? "").trim();
      return !resolveExact(exactMap, barcode, stockCode) && !resolveColor(allProducts, barcode);
    });
    if (!anyUnmatched) continue;
  }

  for (const line of lines) {
    const barcode = String(line.barcode ?? "").trim();
    const stockCode = String(line.stockCode ?? line.merchantSku ?? "").trim();
    const qty = Number(line.quantity ?? 0);
    const name = String(line.productName ?? "").trim();
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const exact = resolveExact(exactMap, barcode, stockCode);
    const colorHit = exact ? null : resolveColor(allProducts, barcode);
    const product = exact ?? colorHit;

    if (!product) {
      plans.push({
        order_number: order.order_number,
        order_id: order.id,
        barcode,
        stockCode,
        line_name: name,
        qty,
        status: "HALA_UNMATCHED",
        sku: "",
        stock_before: "",
        stock_after: "",
      });
      continue;
    }

    const before = Number(product.stock_quantity ?? 0);
    const after = Math.max(0, before - qty);
    plans.push({
      order_number: order.order_number,
      order_id: order.id,
      barcode,
      stockCode,
      line_name: name,
      qty,
      status: "ESLESTI_DUSULECEK",
      sku: product.sku,
      product_id: product.id,
      stock_before: before,
      stock_after: after,
      match_via: exact ? "exact" : "color_suffix",
    });
  }
}

console.log(apply ? "=== APPLY ===" : "=== DRY-RUN (yazma yok) ===");
console.log(
  "sipariş | barkod | satır adı | adet | SKU | stok önce→sonra | durum | eşleme",
);
console.log("-".repeat(120));
for (const row of plans) {
  console.log(
    [
      row.order_number,
      row.barcode,
      row.line_name,
      row.qty,
      row.sku || "-",
      row.stock_before === "" ? "-" : `${row.stock_before}→${row.stock_after}`,
      row.status,
      row.match_via ?? "",
    ].join(" | "),
  );
}

const willApply = plans.filter((p) => p.status === "ESLESTI_DUSULECEK");
const stillUnmatched = plans.filter((p) => p.status === "HALA_UNMATCHED");
console.log(
  `\nÖzet: eşleşen=${willApply.length}, hâlâ unmatched=${stillUnmatched.length}, toplam satır=${plans.length}`,
);

if (!apply) {
  console.log("\nYazmak için: node scripts/reprocess-unmatched-ty-orders.mjs --apply");
  process.exit(0);
}

// Group by product for stock updates; track orders to mark applied
const consumeByProduct = new Map();
const orderPatches = new Map();

for (const row of willApply) {
  const cur = consumeByProduct.get(row.product_id) ?? {
    sku: row.sku,
    before: row.stock_before,
    qty: 0,
  };
  cur.qty += row.qty;
  consumeByProduct.set(row.product_id, cur);

  const patch = orderPatches.get(row.order_id) ?? {
    order_number: row.order_number,
    linesMatched: 0,
    raw: null,
  };
  patch.linesMatched += 1;
  orderPatches.set(row.order_id, patch);
}

for (const [productId, info] of consumeByProduct) {
  const { data: fresh } = await admin
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .maybeSingle();
  const before = Number(fresh?.stock_quantity ?? info.before ?? 0);
  const next = Math.max(0, before - info.qty);
  const { error } = await admin
    .from("products")
    .update({ stock_quantity: next, is_active: next > 0 })
    .eq("id", productId);
  if (error) {
    console.error(`[FAIL] ${info.sku}: ${error.message}`);
    continue;
  }
  console.log(`[OK] ${info.sku}: ${before} → ${next} (−${info.qty})`);
}

for (const order of orders ?? []) {
  if (!orderPatches.has(order.id)) continue;
  const effect = order.raw_payload?.stock_effect ?? {};
  if (effect.applied === true) continue;
  const now = new Date().toISOString();
  const raw = {
    ...(order.raw_payload ?? {}),
    stock_effect: {
      ...effect,
      applied: true,
      last_mode: "deduct",
      unmatched_lines: 0,
      error: null,
      updated_at: now,
      reprocessed: true,
    },
  };
  const { error } = await admin
    .from("marketplace_orders")
    .update({ raw_payload: raw, updated_at: now })
    .eq("id", order.id);
  if (error) console.error(`[FAIL] order ${order.order_number}: ${error.message}`);
  else console.log(`[OK] order ${order.order_number} stock_effect.applied=true`);
}

console.log("\nApply bitti.");
