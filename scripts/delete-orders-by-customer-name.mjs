/**
 * Verilen müşteri adına (customer_name) ait siparişleri siler.
 * Sipariş kalemleri orders üzerinde ON DELETE CASCADE ile silinir.
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Örnek:
 *   CUSTOMER_NAME="Özgün Sena Uğur" CONFIRM=YES_DELETE_ORDERS_BY_NAME node scripts/delete-orders-by-customer-name.mjs
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

const CUSTOMER_NAME = String(process.env.CUSTOMER_NAME ?? "").trim();
const CONFIRM = process.env.CONFIRM ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (CONFIRM !== "YES_DELETE_ORDERS_BY_NAME") {
  console.error(
    "Güvenlik: CONFIRM=YES_DELETE_ORDERS_BY_NAME ve CUSTOMER_NAME=\"...\" ile çağırın veya delete-orders-by-customer-name.sql kullanın.",
  );
  process.exit(1);
}

if (!CUSTOMER_NAME) {
  console.error("CUSTOMER_NAME boş olamaz.");
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const normalized = CUSTOMER_NAME.trim().replace(/\s+/g, " ").toLowerCase();
const trimmed = CUSTOMER_NAME.trim();
const safePattern = `%${trimmed.replace(/\\/g, "\\\\").replace(/%/g, "\\%")}%`;

const { data: candidates, error: selErr } = await supabase
  .from("orders")
  .select("id,order_number,customer_name")
  .ilike("customer_name", safePattern)
  .limit(3000);

if (selErr) {
  console.error("Sipariş sorgusu hatası:", selErr.message);
  process.exit(1);
}

const matched = (candidates ?? []).filter(
  (r) => String(r.customer_name ?? "").replace(/\s+/g, " ").trim().toLowerCase() === normalized,
);
const ids = matched.map((r) => r.id);

if (ids.length === 0) {
  console.log(`Eşleşen sipariş yok: "${CUSTOMER_NAME}"`);
  process.exit(0);
}

console.log(`${ids.length} sipariş silinecek:`, matched.map((r) => r.order_number).join(", "));

for (const id of ids) {
  const { error: e1 } = await supabase.from("payment_logs").delete().eq("order_id", id);
  if (e1) {
    console.error("payment_logs:", id, e1.message);
    process.exit(1);
  }
  const { error: e2 } = await supabase.from("loyalty_points_ledger").delete().eq("order_id", id);
  if (e2) {
    console.error("loyalty_points_ledger:", id, e2.message);
    process.exit(1);
  }
  const { error: e3 } = await supabase.from("orders").delete().eq("id", id);
  if (e3) {
    console.error("orders:", id, e3.message);
    process.exit(1);
  }
}

console.log("Tamamlandı.");
