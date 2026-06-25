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

const orderNo = process.argv[2] ?? "ZLL0006";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: order } = await admin
  .from("orders")
  .select("id,order_number,payment_status,payment_provider,total,gift_card_redeem_amount,created_at,updated_at")
  .eq("order_number", orderNo)
  .maybeSingle();

if (!order) {
  console.error("Sipariş yok");
  process.exit(1);
}

console.log("ORDER", order);

const { data: items } = await admin
  .from("order_items")
  .select("id,product_id,quantity,created_at")
  .eq("order_id", order.id)
  .order("created_at", { ascending: true });

console.log("\nITEMS", items?.length);
for (const item of items ?? []) {
  const { data: p } = await admin.from("products").select("sku,stock_quantity,product_kind").eq("id", item.product_id).maybeSingle();
  console.log({
    item_id: item.id,
    item_created: item.created_at,
    product_id: item.product_id,
    sku: p?.sku,
    stock_now: p?.stock_quantity,
    kind: p?.product_kind,
    qty: item.quantity,
  });
}

const { data: payLogs } = await admin
  .from("payment_logs")
  .select("provider,event_type,status,callback_hash,callback_payload,created_at")
  .eq("order_id", order.id)
  .order("created_at", { ascending: true });

console.log("\nPAYMENT LOGS");
for (const p of payLogs ?? []) {
  console.log({
    at: p.created_at,
    provider: p.provider,
    event: p.event_type,
    status: p.status,
    hash: p.callback_hash,
    payload: p.callback_payload,
  });
}

const { data: allPayLogs } = await admin
  .from("payment_logs")
  .select("order_id,provider,status,callback_hash,created_at")
  .eq("callback_hash", `gift_card_full:${order.id}`);

console.log("\nCALLBACK HASH MATCHES", allPayLogs);

const since = order.created_at;
const { data: syncLogs } = await admin
  .from("marketplace_sync_logs")
  .select("action,status,message,created_at,request_payload")
  .eq("marketplace", "trendyol")
  .gte("created_at", since)
  .order("created_at", { ascending: true })
  .limit(10);

console.log("\nTRENDYOL SYNC LOGS (sipariş saatinden sonra)");
if (!syncLogs?.length) console.log("  (kayıt yok)");
for (const l of syncLogs ?? []) {
  console.log(`  ${l.created_at} | ${l.status} | ${l.action} | ${(l.message ?? "").slice(0, 120)} | reason=${l.request_payload?.reason ?? "?"}`);
}

