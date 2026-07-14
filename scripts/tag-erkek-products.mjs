/**
 * Erkek ürünlerini target_audience=erkek olarak işaretler.
 *   node scripts/tag-erkek-products.mjs --dry-run
 *   node scripts/tag-erkek-products.mjs
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

const dryRun = process.argv.includes("--dry-run");

const ERKEK_SKUS = ["Zelula87", "Zelula88", "Zelula323", "Zelula360", "Zelula361"];

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: bySku, error: skuErr } = await admin
  .from("products")
  .select("id,sku,name,target_audience,category:categories(slug)")
  .in("sku", ERKEK_SKUS);

if (skuErr) {
  console.error("SKU sorgusu hatası:", skuErr.message);
  process.exit(1);
}

const { data: byName, error: nameErr } = await admin
  .from("products")
  .select("id,sku,name,target_audience,category:categories(slug)")
  .ilike("name", "%erkek%");

if (nameErr) {
  console.error("İsim sorgusu hatası:", nameErr.message);
  process.exit(1);
}

const merged = new Map();
for (const row of [...(bySku ?? []), ...(byName ?? [])]) {
  merged.set(row.id, row);
}
const targets = [...merged.values()];

console.log(dryRun ? "=== DRY RUN ===" : "=== Erkek etiketleme ===");
console.log(`Hedef ürün: ${targets.length}\n`);

for (const p of targets) {
  const cat = p.category && typeof p.category === "object" ? p.category.slug : "?";
  console.log(`  ${p.sku} | ${p.target_audience ?? "?"} → erkek | kategori=${cat} | ${String(p.name).slice(0, 50)}`);
}

const toUpdate = targets.filter((p) => p.target_audience !== "erkek").map((p) => p.id);
if (toUpdate.length === 0) {
  console.log("\nGüncellenecek ürün yok.");
  process.exit(0);
}

if (dryRun) {
  console.log(`\n${toUpdate.length} ürün erkek olarak işaretlenecek.`);
  process.exit(0);
}

const { error: updateErr } = await admin.from("products").update({ target_audience: "erkek" }).in("id", toUpdate);
if (updateErr) {
  console.error("Güncelleme hatası:", updateErr.message);
  process.exit(1);
}

console.log(`\n${toUpdate.length} ürün target_audience=erkek olarak güncellendi.`);

const missing = ERKEK_SKUS.filter((sku) => !(bySku ?? []).some((p) => p.sku === sku));
if (missing.length > 0) {
  console.warn("\nDB'de bulunamayan SKU:", missing.join(", "));
}
