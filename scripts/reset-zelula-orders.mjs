/**
 * Tüm Zelula siparişlerini siler ve ZLL sipariş numarası sırasını başa alır.
 *
 * Gerekli ortam: .env.local içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY
 *
 * Çalıştırma (bilinçli onay ile):
 *   CONFIRM=YES_I_WANT_TO_DELETE_ALL_ORDERS node scripts/reset-zelula-orders.mjs
 *
 * Not: Supabase JS ile sequence (setval) çalıştırılamaz; silme işleminden sonra
 * aşağıdaki SQL'i SQL Editor'de bir kez çalıştırın:
 *   select setval('public.order_public_number_seq', 1, false);
 *
 * Alternatif: scripts/reset-zelula-orders.sql dosyasını tek parça SQL Editor'de çalıştırın.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(projectRoot, ".env"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONFIRM = process.env.CONFIRM ?? "";

if (CONFIRM !== "YES_I_WANT_TO_DELETE_ALL_ORDERS") {
  console.error(
    "Güvenlik: CONFIRM=YES_I_WANT_TO_DELETE_ALL_ORDERS ile çağırın veya reset-zelula-orders.sql kullanın.",
  );
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const { count: beforeCount, error: countErr } = await supabase
  .from("orders")
  .select("*", { count: "exact", head: true });

if (countErr) {
  console.error("Sipariş sayısı okunamadı:", countErr.message);
  process.exit(1);
}

console.log(`Silinecek sipariş sayısı (tahmini): ${beforeCount ?? "?"}`);

const { error: e1 } = await supabase.from("payment_logs").delete().not("order_id", "is", null);
if (e1) {
  console.error("payment_logs silinemedi:", e1.message);
  process.exit(1);
}

const { error: e2 } = await supabase.from("loyalty_points_ledger").delete().not("order_id", "is", null);
if (e2) {
  console.error("loyalty_points_ledger silinemedi:", e2.message);
  process.exit(1);
}

const { error: e3 } = await supabase.from("orders").delete().gte("created_at", "1970-01-01T00:00:00.000Z");
if (e3) {
  console.error("orders silinemedi:", e3.message);
  process.exit(1);
}

console.log("Siparişler ve ilişkili günlükler silindi.");
console.log("");
console.log("Son adım (zorunlu): Supabase SQL Editor’de çalıştırın:");
console.log("  select setval('public.order_public_number_seq', 1, false);");
console.log("");
console.log("Veya tek seferde: scripts/reset-zelula-orders.sql dosyasını kullanın.");
