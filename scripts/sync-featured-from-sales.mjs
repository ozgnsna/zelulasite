/**
 * Gerçek satışa göre featured (çok satan) bayraklarını günceller.
 * Admin panelindeki popularThreshold mantığıyla uyumlu: en çok satan ~%15, min 2 adet.
 *
 *   node scripts/sync-featured-from-sales.mjs
 *   node scripts/sync-featured-from-sales.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY_RUN = process.argv.includes("--dry-run");

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

function computePopularSalesThreshold(salesByProduct) {
  const values = [...salesByProduct.values()].filter((n) => n > 0).sort((a, b) => b - a);
  if (values.length === 0) return 1;
  const idx = Math.max(0, Math.floor(values.length * 0.15) - 1);
  const t = values[idx] ?? values[values.length - 1] ?? 1;
  return Math.max(t, 2);
}

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const [{ data: products }, { data: orderItems }] = await Promise.all([
  admin.from("products").select("id,sku,name,is_active,featured,product_kind").limit(2000),
  admin
    .from("order_items")
    .select("product_id,quantity,order:orders!inner(payment_status,order_status)")
    .eq("order.payment_status", "paid")
    .neq("order.order_status", "cancelled")
    .limit(8000),
]);

const salesByProduct = new Map();
for (const item of orderItems ?? []) {
  const pid = String(item.product_id ?? "").trim();
  if (!pid) continue;
  const ord = item.order;
  const order = Array.isArray(ord) ? ord[0] : ord;
  if (!order || order.payment_status !== "paid" || order.order_status === "cancelled") continue;
  const qty = Number(item.quantity ?? 0);
  salesByProduct.set(pid, (salesByProduct.get(pid) ?? 0) + (Number.isFinite(qty) ? qty : 0));
}

const threshold = computePopularSalesThreshold(salesByProduct);
const toFeature = [];
const toUnfeature = [];

for (const p of products ?? []) {
  if (p.product_kind === "gift_card") {
    if (p.featured) toUnfeature.push(p);
    continue;
  }
  const salesQty = salesByProduct.get(p.id) ?? 0;
  const shouldFeature = Boolean(p.is_active) && salesQty >= threshold && salesQty > 0;
  if (shouldFeature && !p.featured) toFeature.push({ ...p, salesQty });
  if (!shouldFeature && p.featured) toUnfeature.push({ ...p, salesQty });
}

console.log(`Eşik: ${threshold}+ adet satış (aktif ürünler)`);
console.log(`Çok satan yapılacak: ${toFeature.length}`);
console.log(`Çok satan kaldırılacak: ${toUnfeature.length}`);

if (toFeature.length) {
  console.log("\n→ featured=true:");
  for (const p of toFeature.sort((a, b) => b.salesQty - a.salesQty)) {
    console.log(`  ${p.sku} · ${p.salesQty} adet · ${p.name}`);
  }
}

if (toUnfeature.length) {
  console.log("\n→ featured=false:");
  for (const p of toUnfeature.sort((a, b) => (b.salesQty ?? 0) - (a.salesQty ?? 0)).slice(0, 40)) {
    console.log(`  ${p.sku} · ${p.salesQty ?? 0} adet · ${p.name}`);
  }
  if (toUnfeature.length > 40) console.log(`  … +${toUnfeature.length - 40} daha`);
}

if (DRY_RUN) {
  console.log("\n(dry-run — DB güncellenmedi)");
  process.exit(0);
}

const featureIds = toFeature.map((p) => p.id);
const unfeatureIds = toUnfeature.map((p) => p.id);

if (featureIds.length) {
  const { error } = await admin.from("products").update({ featured: true }).in("id", featureIds);
  if (error) throw error;
}

if (unfeatureIds.length) {
  const { error } = await admin.from("products").update({ featured: false }).in("id", unfeatureIds);
  if (error) throw error;
}

console.log("\n✓ featured bayrakları güncellendi.");
