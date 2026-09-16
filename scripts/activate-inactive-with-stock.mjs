/**
 * Stoklu satışa kapalı ürünleri açar (is_active=true).
 *
 * Dry-run:
 *   node scripts/activate-inactive-with-stock.mjs
 *
 * Uygula:
 *   CONFIRM=YES_ACTIVATE_INACTIVE_WITH_STOCK node scripts/activate-inactive-with-stock.mjs
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

const CONFIRM = process.env.CONFIRM === "YES_ACTIVATE_INACTIVE_WITH_STOCK";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: products, error } = await admin
  .from("products")
  .select("id,sku,name,stock_quantity,is_active,trendyol_active")
  .eq("is_active", false)
  .gt("stock_quantity", 0)
  .order("sku");

if (error) {
  console.error(error.message);
  process.exit(1);
}

const rows = products ?? [];
console.log(CONFIRM ? "=== SATIŞA AÇILIYOR ===" : "=== DRY-RUN: satışa açma ===");
console.log(`Stoklu kapalı ürün: ${rows.length}\n`);

for (const p of rows) {
  console.log(
    `  ${p.sku} | stok=${p.stock_quantity} | TY=${p.trendyol_active ? "açık" : "kapalı"} | ${String(p.name ?? "").slice(0, 55)}`,
  );
}

if (!CONFIRM) {
  console.log("\nUygulamak için:");
  console.log("  CONFIRM=YES_ACTIVATE_INACTIVE_WITH_STOCK node scripts/activate-inactive-with-stock.mjs");
  process.exit(0);
}

const ids = rows.map((p) => p.id);
const chunkSize = 100;
let updated = 0;

for (let i = 0; i < ids.length; i += chunkSize) {
  const chunk = ids.slice(i, i + chunkSize);
  const { error: updErr } = await admin.from("products").update({ is_active: true }).in("id", chunk);
  if (updErr) {
    console.error("Güncelleme hatası:", updErr.message);
    process.exit(1);
  }
  updated += chunk.length;
}

const { count: inactiveLeft } = await admin
  .from("products")
  .select("id", { count: "exact", head: true })
  .eq("is_active", false);

const { count: activeWithStock } = await admin
  .from("products")
  .select("id", { count: "exact", head: true })
  .eq("is_active", true)
  .gt("stock_quantity", 0);

console.log(`\nTamam: ${updated} ürün satışa açıldı (is_active=true).`);
console.log(`Kalan satışa kapalı: ${inactiveLeft ?? "?"}`);
console.log(`Aktif + stoklu ürün: ${activeWithStock ?? "?"}`);
