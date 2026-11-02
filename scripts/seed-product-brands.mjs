/**
 * Seed products.brand for known third-party brands.
 *
 * Usage:
 *   node scripts/seed-product-brands.mjs
 *   node scripts/seed-product-brands.mjs --apply
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[key] = v;
    }
  }
}

loadEnv();

const apply = process.argv.includes("--apply");

/** @type {Record<string, string>} */
const BRAND_BY_SKU = {
  Zelula457: "Coliseum",
  Zelula458: "Coliseum",
  Zelula459: "Coliseum",
  Zelula461: "Coliseum",
  Zelula463: "Coliseum",
  Zelula464: "Coliseum",
  BLK114: "Xuping",
  Zelula86: "Xuping",
  Zelula200: "Xuping",
  Zelula201: "Xuping",
  Zelula203: "Xuping",
  Zelula204: "Xuping",
  Zelula244: "Xuping",
  Zelula245: "Xuping",
  Zelula260: "Xuping",
  "ZL-DETAYLI-ZIRKON": "Xuping",
};

const skus = Object.keys(BRAND_BY_SKU);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

let brandColumnReady = true;
let { data, error } = await admin
  .from("products")
  .select("id,sku,name,brand,is_active")
  .in("sku", skus);

if (error && (/column .*brand/i.test(error.message) || /brand.*does not exist/i.test(error.message))) {
  brandColumnReady = false;
  console.warn("Uyarı: products.brand kolonu yok — migration henüz uygulanmamış.");
  console.warn("Dosya: supabase/migrations/20261102160000_products_brand.sql\n");
  ({ data, error } = await admin.from("products").select("id,sku,name,is_active").in("sku", skus));
}

if (error) {
  console.error("Select failed:", error.message);
  process.exit(1);
}

if (!brandColumnReady && apply) {
  console.error("APPLY için önce migration çalıştırın, sonra tekrar deneyin.");
  process.exit(1);
}

const bySku = new Map((data ?? []).map((r) => [r.sku, r]));
const missing = skus.filter((s) => !bySku.has(s));
if (missing.length) {
  console.warn("Uyarı — katalogda bulunamayan SKU:", missing.join(", "));
}

console.log(apply ? "=== APPLY ===" : "=== DRY RUN ===");
console.log(`Planlanan: ${skus.length} SKU\n`);

let wouldChange = 0;
let alreadyOk = 0;
for (const sku of skus) {
  const row = bySku.get(sku);
  const want = BRAND_BY_SKU[sku];
  if (!row) {
    console.log(`  SKIP missing  ${sku} → ${want}`);
    continue;
  }
  const current = String(row.brand ?? "").trim() || null;
  if (current === want) {
    alreadyOk += 1;
    console.log(`  OK   ${sku} | ${row.is_active ? "active" : "off"} | brand=${want} | ${row.name}`);
    continue;
  }
  wouldChange += 1;
  console.log(
    `  SET  ${sku} | ${row.is_active ? "active" : "off"} | ${current ?? "(null)"} → ${want} | ${row.name}`,
  );
}

console.log(`\nÖzet: değişecek=${wouldChange}, zaten_ok=${alreadyOk}, eksik=${missing.length}`);

if (!apply) {
  console.log("\nUygulamak için: node scripts/seed-product-brands.mjs --apply");
  process.exit(0);
}

if (wouldChange === 0) {
  console.log("Yazılacak değişiklik yok.");
  process.exit(0);
}

let updated = 0;
for (const sku of skus) {
  const row = bySku.get(sku);
  if (!row) continue;
  const want = BRAND_BY_SKU[sku];
  const current = String(row.brand ?? "").trim() || null;
  if (current === want) continue;
  const { error: upErr } = await admin.from("products").update({ brand: want }).eq("id", row.id);
  if (upErr) {
    console.error(`FAIL ${sku}:`, upErr.message);
    process.exit(1);
  }
  updated += 1;
  console.log(`  UPDATED ${sku} → ${want}`);
}

console.log(`\nToplam güncellenen: ${updated}`);
