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

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
const [{ data: logs }, { data: orders }, { data: mpOrders }] = await Promise.all([
  admin
    .from("marketplace_sync_logs")
    .select("action,status,message,created_at")
    .eq("marketplace", "trendyol")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20),
  admin
    .from("orders")
    .select("order_number,payment_status,order_status,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10),
  admin
    .from("marketplace_orders")
    .select("external_order_id,order_status,updated_at")
    .eq("marketplace", "trendyol")
    .order("updated_at", { ascending: false })
    .limit(10),
]);

console.log("=== Son Trendyol sync logları (48s) ===");
for (const l of logs ?? []) {
  console.log(`${l.created_at} | ${l.status} | ${l.action} | ${(l.message ?? "").slice(0, 120)}`);
}

console.log("\n=== Son site siparişleri (48s) ===");
for (const o of orders ?? []) {
  console.log(`${o.created_at} | ${o.order_number} | ${o.payment_status} | ${o.order_status}`);
}

console.log("\n=== Son Trendyol marketplace_orders ===");
for (const o of mpOrders ?? []) {
  console.log(`${o.updated_at} | #${o.external_order_id} | ${o.order_status}`);
}
