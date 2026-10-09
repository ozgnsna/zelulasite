/**
 * Mevcut Supabase ürün görselleri için w400/w800 WebP.
 *   node scripts/backfill-product-image-derivatives.mjs
 *   node scripts/backfill-product-image-derivatives.mjs --apply
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  buildDerivativeBuffers,
  storageObjectPathFromPublicUrl,
  uploadDerivativeBuffers,
} from "../src/lib/images/generate-product-derivatives.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");

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

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function isRasterSupabase(url) {
  const objectPath = storageObjectPathFromPublicUrl(url);
  if (!objectPath) return false;
  if (/__w\d+\.webp$/i.test(objectPath)) return false;
  if (/\.(mp4|webm|mov|svg|pdf)$/i.test(objectPath)) return false;
  return /\.(jpe?g|png|webp)$/i.test(objectPath);
}

const probe = await admin.from("product_images").select("derivative_widths").limit(1);
const hasColumn = !probe.error;
if (!hasColumn) {
  console.log("derivative_widths kolonu henüz yok. --apply öncesi SQL Editor'da çalıştırın:");
  console.log("supabase/migrations/20261009140000_product_image_derivative_widths.sql\n");
}

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await admin
    .from("product_images")
    .select(hasColumn ? "id,product_id,image_url,derivative_widths" : "id,product_id,image_url")
    .range(from, from + 999);
  if (error) {
    console.error("Sorgu hatası:", error.message);
    process.exit(1);
  }
  rows.push(...(data ?? []));
  if (!data || data.length < 1000) break;
}

const eligible = rows.filter((row) => isRasterSupabase(String(row.image_url ?? "")));
const already = eligible.filter((row) => Array.isArray(row.derivative_widths) && row.derivative_widths.length > 0);
const pending = eligible.filter((row) => !already.includes(row));
const cdn = rows.filter((row) => String(row.image_url ?? "").includes("cdn.dsmcdn.com"));

console.log(
  JSON.stringify(
    {
      mode: APPLY ? "apply" : "dry-run",
      product_image_rows: rows.length,
      supabase_raster: eligible.length,
      already_flagged: already.length,
      pending: pending.length,
      trendyol_cdn_rows: cdn.length,
    },
    null,
    2,
  ),
);

if (APPLY && !hasColumn) {
  console.error("Kolon yok, --apply durdu.");
  process.exit(1);
}

if (!APPLY) {
  const { data: activeProducts } = await admin.from("products").select("id,sku,name,is_active").eq("is_active", true);
  const byProduct = new Map();
  for (const row of rows) {
    const list = byProduct.get(row.product_id) ?? [];
    list.push(String(row.image_url ?? ""));
    byProduct.set(row.product_id, list);
  }
  const cdnOnly = [];
  for (const product of activeProducts ?? []) {
    const urls = byProduct.get(product.id) ?? [];
    if (urls.length === 0) continue;
    const own = urls.filter((url) => storageObjectPathFromPublicUrl(url));
    const remote = urls.filter((url) => url.includes("cdn.dsmcdn.com"));
    if (remote.length > 0 && own.length === 0) {
      cdnOnly.push({ sku: product.sku, name: product.name, images: remote.length });
    }
  }
  console.log(`\nAktif ürün, tek kaynak Trendyol CDN: ${cdnOnly.length}`);
  for (const item of cdnOnly) console.log(`  ${item.sku}  ${item.images} görsel  ${item.name}`);
  console.log("\nDry-run bitti. Dosya indirilmedi, türev yazılmadı.");
  process.exit(0);
}

const CONCURRENCY = 4;
let ok = 0;
let skipped = 0;
let failed = 0;
let derivativeFiles = 0;
const failures = [];
const started = Date.now();
let cursor = 0;

async function fetchImageBytes(url) {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url);
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    lastStatus = response.status;
    if (response.status !== 429 && response.status < 500) break;
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  throw new Error(`HTTP ${lastStatus}`);
}

async function processRow(row) {
  const url = String(row.image_url);
  const objectPath = storageObjectPathFromPublicUrl(url);
  try {
    const bytes = await fetchImageBytes(url);
    const derivatives = await buildDerivativeBuffers(bytes);
    const widths = await uploadDerivativeBuffers(admin.storage, objectPath, derivatives);
    const { error } = await admin.from("product_images").update({ derivative_widths: widths }).eq("id", row.id);
    if (error) throw new Error(error.message);
    if (widths.length === 0) skipped += 1;
    else {
      ok += 1;
      derivativeFiles += widths.length;
    }
  } catch (err) {
    failed += 1;
    const message = err instanceof Error ? err.message : String(err);
    failures.push({ id: row.id, path: objectPath, message });
    console.error("fail", row.id, objectPath, message);
  }
  const done = ok + skipped + failed;
  if (done % 25 === 0 || done === pending.length) {
    console.log(`ilerleme ${done}/${pending.length} ok=${ok} skip=${skipped} fail=${failed} dosya=${derivativeFiles}`);
  }
}

async function worker() {
  while (cursor < pending.length) {
    const row = pending[cursor];
    cursor += 1;
    await processRow(row);
  }
}

console.log(`apply başlıyor: ${pending.length} görsel, eşzamanlılık ${CONCURRENCY}`);
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, () => worker()));

console.log(
  JSON.stringify(
    {
      ok,
      derivative_files: derivativeFiles,
      skipped_not_smaller_or_unreadable: skipped,
      failed,
      seconds: Math.round((Date.now() - started) / 1000),
      failures,
    },
    null,
    2,
  ),
);
