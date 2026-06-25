/**
 * Siparişe DHL kargo kodu ve takip linki ekler.
 *   node scripts/set-order-dhl-tracking.mjs ZLL0003 1234567890
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

function buildDhlTrackingUrl(trackingNumber) {
  const id = String(trackingNumber ?? "").trim();
  if (!id || /^DHL-MOCK-/i.test(id)) return null;
  return `https://www.dhl.com/tr-tr/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(id)}`;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const orderNumberArg = process.argv[2];
const byCustomer = orderNumberArg === "--customer";
const customerName = byCustomer ? String(process.argv[3] ?? "").trim() : "";
const trackingNumberFinal = byCustomer
  ? String(process.argv[4] ?? "").trim()
  : String(process.argv[3] ?? "").trim();
const trackingUrlArgFinal = byCustomer
  ? String(process.argv[5] ?? "").trim()
  : String(process.argv[4] ?? "").trim();

if (!orderNumberArg || !trackingNumberFinal || (byCustomer && !customerName)) {
  console.error("Kullanım:");
  console.error("  node scripts/set-order-dhl-tracking.mjs <sipariş_no> <dhl_kod> [takip_url]");
  console.error('  node scripts/set-order-dhl-tracking.mjs --customer "Ad Soyad" <dhl_kod> [takip_url]');
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let order = null;
if (byCustomer) {
  const { data: rows } = await admin
    .from("orders")
    .select("id,order_number,customer_name,payment_status,created_at")
    .ilike("customer_name", `%${customerName}%`)
    .eq("payment_status", "paid")
    .order("created_at", { ascending: false })
    .limit(5);
  if (!rows?.length) {
    console.error("Ödenmiş sipariş bulunamadı:", customerName);
    process.exit(1);
  }
  order = rows[0];
} else {
  const { data } = await admin
    .from("orders")
    .select("id,order_number,customer_name,payment_status")
    .eq("order_number", orderNumberArg)
    .maybeSingle();
  order = data;
}

if (!order) {
  console.error("Sipariş bulunamadı:", orderNumberArg);
  process.exit(1);
}

const trackingUrl = trackingUrlArgFinal || buildDhlTrackingUrl(trackingNumberFinal);
const now = new Date().toISOString();

const { error } = await admin
  .from("orders")
  .update({
    order_status: "shipped",
    shipping_provider: "dhl",
    shipping_tracking_number: trackingNumberFinal,
    shipping_label_url: trackingUrl,
    shipping_status: "created",
    shipping_created_at: now,
    updated_at: now,
  })
  .eq("id", order.id);

if (error) {
  console.error("Güncelleme hatası:", error.message);
  process.exit(1);
}

console.log("Tamam:", order.order_number, order.customer_name);
console.log("Kargo kodu:", trackingNumberFinal);
console.log("Takip linki:", trackingUrl ?? "(yok)");
