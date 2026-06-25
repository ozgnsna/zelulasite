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

const { data: order } = await admin.from("orders").select("id,order_number,payment_status,payment_provider,total,created_at").eq("order_number", orderNo).maybeSingle();
if (!order) {
  console.error("Sipariş bulunamadı:", orderNo);
  process.exit(1);
}

const { data: items, error: itemsError } = await admin
  .from("order_items")
  .select("product_id,quantity,unit_price")
  .eq("order_id", order.id);

if (itemsError) {
  console.error("order_items okuma hatası:", itemsError.message);
}

console.log(`Sipariş ${order.order_number} (${order.payment_status}, ${order.payment_provider ?? "?"}) — ${order.created_at}\n`);

if (!items?.length) {
  console.log("(Sipariş satırı bulunamadı — hediye kartı veya kayıt eksik olabilir.)");
} else {
  for (const item of items) {
  const { data: p } = await admin
    .from("products")
    .select("sku,name,stock_quantity,trendyol_active,trendyol_barcode,trendyol_stock_code")
    .eq("id", item.product_id)
    .maybeSingle();
    console.log(`- ${item.quantity}x ${p?.sku ?? "?"} | site stok: ${p?.stock_quantity} | trendyol_active: ${p?.trendyol_active}`);
    console.log(`  ${p?.name ?? item.product_id}`);
  }
}

const productIds = (items ?? []).map((i) => i.product_id).filter(Boolean);
if (productIds.length) {
  const { data: logs } = await admin
    .from("marketplace_sync_logs")
    .select("action,status,message,created_at")
    .eq("marketplace", "trendyol")
    .in("entity_id", productIds)
    .order("created_at", { ascending: false })
    .limit(10);
  console.log("\nBu ürünler için Trendyol sync logları:");
  if (!logs?.length) console.log("  (kayıt yok)");
  for (const l of logs ?? []) console.log(`  ${l.created_at} | ${l.status} | ${l.action} | ${l.message?.slice(0, 100)}`);
}

const { data: payLogs } = await admin
  .from("payment_logs")
  .select("provider,event_type,status,created_at")
  .eq("order_id", order.id)
  .order("created_at", { ascending: true });
console.log("\nÖdeme logları:");
for (const p of payLogs ?? []) console.log(`  ${p.created_at} | ${p.provider} | ${p.event_type} | ${p.status}`);
