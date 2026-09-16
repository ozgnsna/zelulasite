/**
 * 10 barkod tutarsız ürünü TY kataloğundan eşleştirip DB'ye yazar.
 *   node scripts/fix-inactive-barcode-mismatches.mjs
 *   CONFIRM=YES_FIX_INACTIVE_BARCODES node scripts/fix-inactive-barcode-mismatches.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const TARGET_SKUS = [
  "BLK105",
  "Zelula 151",
  "Zelula 152",
  "ZL-ALTIN",
  "ZL-PEARL-INCI",
  "Zelula206",
  "ZL-YENGEC-GOLD",
  "ZL-THE",
  "ZL-MERCAN-INCI",
  "ZL-LAPIS-BEYAZ-MAVİ",
];

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

const CONFIRM = process.env.CONFIRM === "YES_FIX_INACTIVE_BARCODES";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function trim(v) {
  return String(v ?? "").trim();
}

function norm(v) {
  return trim(v).toLocaleLowerCase("tr-TR").replace(/\s+/g, "");
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

async function getIntegration() {
  const { data } = await admin
    .from("marketplace_integrations")
    .select("environment,seller_id,api_key,api_secret,is_active")
    .eq("marketplace", "trendyol")
    .maybeSingle();
  if (!data?.is_active || !data.api_key || !data.api_secret) throw new Error("Trendyol entegrasyonu yok.");
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
    const body = await res.json();
    const content = Array.isArray(body?.content) ? body.content : [];
    if (content.length === 0) break;
    all.push(...content);
    if (content.length < 100) break;
    const token = trim(body?.nextPageToken);
    if (!token) break;
    nextPageToken = token;
  }
  return all.map((item) => ({
    title: trim(item?.title),
    barcode: extractBarcode(item),
    stockCode: extractStockCode(item),
    qty: Number(item?.quantity ?? firstVariant(item)?.stock?.quantity ?? 0),
    onSale: Boolean(firstVariant(item)?.onSale),
  }));
}

function scoreMatch(product, ty) {
  const keys = [
    norm(product.sku),
    norm(product.trendyol_stock_code),
    norm(product.trendyol_barcode),
    norm(product.name),
  ].filter((k) => k.length >= 3);

  const tyKeys = [norm(ty.barcode), norm(ty.stockCode), norm(ty.title)].filter(Boolean);
  let best = 0;
  let reason = "";

  for (const k of keys) {
    for (const t of tyKeys) {
      if (k === t) return { score: 100, reason: "exact" };
      if (t.includes(k) || k.includes(t)) {
        if (Math.max(k.length, t.length) >= 6) {
          best = Math.max(best, 80);
          reason = "contains";
        }
      }
    }
  }

  // SKU token in title
  const skuNorm = norm(product.sku).replace(/[^a-z0-9]/g, "");
  const titleNorm = norm(ty.title).replace(/[^a-z0-9]/g, "");
  if (skuNorm.length >= 5 && titleNorm.includes(skuNorm)) {
    best = Math.max(best, 75);
    reason = "sku_in_title";
  }

  return { score: best, reason };
}

function pickBestMatch(product, tyRows) {
  const scored = tyRows
    .map((ty) => ({ ty, ...scoreMatch(product, ty) }))
    .filter((x) => x.score >= 75)
    .sort((a, b) => b.score - a.score);
  return scored[0] ?? null;
}

/** Manuel düzeltmeler: DB tutarlılığı + TY doğrulaması */
const MANUAL_FIXES = {
  BLK105: { trendyol_barcode: "BLK105", trendyol_stock_code: "BLK105", note: "Varyant suffix kaldırıldı (BLK105-1 → BLK105)" },
  "Zelula 151": { trendyol_barcode: "Zelula151", trendyol_stock_code: "Zelula151", note: "zelula151 → Zelula151 normalize" },
  "Zelula 152": { trendyol_barcode: "Zelula152", trendyol_stock_code: "Zelula152", note: "zelula152 → Zelula152 normalize" },
  "ZL-ALTIN": {
    trendyol_barcode: "ZL-MaviFiyonk",
    trendyol_stock_code: "ZL-MaviFiyonk",
    note: "Stok kodu ZL-ALTIN → ZL-MaviFiyonk (ürün adıyla uyumlu)",
  },
  "ZL-PEARL-INCI": {
    trendyol_barcode: "ZL-PEARL-INCI",
    trendyol_stock_code: "ZL-PEARL-INCI",
    note: "Yanlış Zelula213 barkodu kaldırıldı",
  },
  Zelula206: { trendyol_barcode: "Zelula206", trendyol_stock_code: "Zelula206", note: "Yanlış Zelula207 barkodu düzeltildi" },
  "ZL-YENGEC-GOLD": {
    trendyol_barcode: "Zelula270",
    trendyol_stock_code: "Zelula270",
    note: "TY: Cancer (Yengeç Burcu) Gold — Zelula270",
  },
  "ZL-THE": {
    trendyol_barcode: "ZL-THE",
    trendyol_stock_code: "ZL-THE",
    note: "Boş barkod dolduruldu (TY'de listelenmiyor)",
  },
  "ZL-MERCAN-INCI": {
    trendyol_barcode: "ZL-MERCAN-INCI",
    trendyol_stock_code: "ZL-MERCAN-INCI",
    note: "Boş barkod dolduruldu (TY'de listelenmiyor)",
  },
  "ZL-LAPIS-BEYAZ-MAVİ": {
    trendyol_barcode: "ZL-LAPIS-BEYAZ-MAVİ",
    trendyol_stock_code: "ZL-LAPIS-BEYAZ-MAVİ",
    note: "Stok kodu ZL-LAPIS → SKU ile hizalandı (TY'de listelenmiyor)",
  },
};

const integration = await getIntegration();
const tyRows = await fetchTyCatalog(integration);

const { data: products, error } = await admin
  .from("products")
  .select("id,sku,name,trendyol_barcode,trendyol_stock_code,is_active")
  .in("sku", TARGET_SKUS);

if (error) throw error;

const bySku = new Map((products ?? []).map((p) => [p.sku, p]));
const plan = [];

for (const sku of TARGET_SKUS) {
  const p = bySku.get(sku);
  if (!p) {
    plan.push({ sku, status: "missing_in_db" });
    continue;
  }

  const manual = MANUAL_FIXES[sku];
  if (manual) {
    const tyHit = tyRows.find(
      (ty) =>
        norm(ty.barcode) === norm(manual.trendyol_barcode) ||
        norm(ty.stockCode) === norm(manual.trendyol_stock_code),
    );
    plan.push({
      sku,
      id: p.id,
      name: trim(p.name).slice(0, 60),
      before: { barcode: trim(p.trendyol_barcode) || null, stockCode: trim(p.trendyol_stock_code) || null },
      after: { barcode: manual.trendyol_barcode, stockCode: manual.trendyol_stock_code },
      source: "manual",
      note: manual.note,
      tyVerified: Boolean(tyHit),
      tyTitle: tyHit?.title ?? null,
    });
    continue;
  }

  const match = pickBestMatch(p, tyRows);
  if (match) {
    plan.push({
      sku,
      id: p.id,
      name: trim(p.name).slice(0, 60),
      before: { barcode: trim(p.trendyol_barcode) || null, stockCode: trim(p.trendyol_stock_code) || null },
      after: { barcode: match.ty.barcode, stockCode: match.ty.stockCode || match.ty.barcode },
      source: `ty_match_${match.reason}`,
      note: match.ty.title.slice(0, 80),
      tyVerified: true,
      tyTitle: match.ty.title,
    });
  } else {
    // Son çare: stok kodunu barkod olarak kullan (boş barkodlar için)
    const fallback = trim(p.trendyol_stock_code) || trim(p.sku);
    const tyHit = tyRows.find((ty) => norm(ty.barcode) === norm(fallback) || norm(ty.stockCode) === norm(fallback));
    if (tyHit) {
      plan.push({
        sku,
        id: p.id,
        name: trim(p.name).slice(0, 60),
        before: { barcode: trim(p.trendyol_barcode) || null, stockCode: trim(p.trendyol_stock_code) || null },
        after: { barcode: tyHit.barcode, stockCode: tyHit.stockCode || tyHit.barcode },
        source: "ty_exact_fallback",
        note: tyHit.title.slice(0, 80),
        tyVerified: true,
        tyTitle: tyHit.title,
      });
    } else {
      plan.push({
        sku,
        id: p.id,
        name: trim(p.name).slice(0, 60),
        before: { barcode: trim(p.trendyol_barcode) || null, stockCode: trim(p.trendyol_stock_code) || null },
        status: "no_ty_match",
      });
    }
  }
}

console.log(CONFIRM ? "=== UYGULA: barkod düzeltmeleri ===" : "=== DRY-RUN: barkod düzeltmeleri ===\n");

for (const row of plan) {
  if (row.status === "missing_in_db") {
    console.log(`MISSING | ${row.sku}`);
    continue;
  }
  if (row.status === "no_ty_match") {
    console.log(`NO MATCH | ${row.sku} | barkod=${row.before.barcode} stokKodu=${row.before.stockCode}`);
    console.log(`         ${row.name}`);
    continue;
  }
  console.log(`${row.tyVerified ? "OK" : "WARN"} | ${row.sku} [${row.source}]`);
  console.log(`  ${row.name}`);
  console.log(`  önce: barkod=${row.before.barcode} stokKodu=${row.before.stockCode}`);
  console.log(`  sonra: barkod=${row.after.barcode} stokKodu=${row.after.stockCode}`);
  console.log(`  not: ${row.note}`);
  if (row.tyTitle) console.log(`  TY: ${row.tyTitle.slice(0, 70)}`);
}

const applicable = plan.filter((r) => r.after && r.id);
const noMatch = plan.filter((r) => r.status === "no_ty_match");

console.log(`\nUygulanabilir: ${applicable.length} | TY'de bulunamayan: ${noMatch.length}`);

if (!CONFIRM) {
  console.log("\nUygulamak için:");
  console.log("  CONFIRM=YES_FIX_INACTIVE_BARCODES node scripts/fix-inactive-barcode-mismatches.mjs");
  process.exit(0);
}

let updated = 0;
for (const row of applicable) {
  const { error: updErr } = await admin
    .from("products")
    .update({
      trendyol_barcode: row.after.barcode,
      trendyol_stock_code: row.after.stockCode,
    })
    .eq("id", row.id);
  if (updErr) {
    console.error(`Hata ${row.sku}:`, updErr.message);
    continue;
  }
  updated += 1;
}

console.log(`\nTamam: ${updated} ürün güncellendi.`);
