/**
 * Trendyol API uç noktalarını hızlı kontrol (okuma/yazma).
 *   node scripts/probe-trendyol-apis.mjs
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

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: integration } = await admin
  .from("marketplace_integrations")
  .select("environment,seller_id,supplier_id,api_key,api_secret,is_active")
  .eq("marketplace", "trendyol")
  .maybeSingle();

if (!integration?.is_active) {
  console.error("Trendyol entegrasyonu aktif değil.");
  process.exit(1);
}

const base = integration.environment === "prod" ? "https://apigw.trendyol.com" : "https://stageapigw.trendyol.com";
const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
const headers = {
  Authorization: `Basic ${auth}`,
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": `${integration.seller_id} - Zelula`,
};
const supplierId = integration.supplier_id || integration.seller_id;
const start = Date.now() - 3 * 24 * 3600 * 1000;
const end = Date.now();

async function probe(label, method, apiPath, body) {
  const url = `${base}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let preview = text.slice(0, 180).replace(/\s+/g, " ");
  try {
    const j = text ? JSON.parse(text) : null;
    if (j && typeof j === "object") {
      preview = JSON.stringify(j).slice(0, 180);
    }
  } catch {
    /* keep text preview */
  }
  console.log(`${label}: HTTP ${res.status} ${res.ok ? "OK" : "FAIL"} — ${preview}`);
  return res.ok;
}

console.log(`Entegrasyon: ${integration.environment}, seller=${integration.seller_id}, supplier=${supplierId}\n`);

await probe("Ürün listesi (read)", "GET", `/integration/product/sellers/${integration.seller_id}/products/approved?size=1&page=0`);
await probe(
  "Siparişler (read, yeni path)",
  "GET",
  `/integration/order/sellers/${integration.seller_id}/orders?page=0&size=1&startDate=${start}&endDate=${end}`,
);
await probe(
  "Siparişler (read, eski path — deprecated)",
  "GET",
  `/suppliers/${supplierId}/orders?page=0&size=1&startDate=${start}&endDate=${end}`,
);

const { data: sample } = await admin
  .from("products")
  .select("trendyol_barcode,trendyol_sale_price,trendyol_list_price,stock_quantity,price")
  .eq("trendyol_active", true)
  .not("trendyol_barcode", "is", null)
  .gt("stock_quantity", 0)
  .limit(1)
  .maybeSingle();

if (sample?.trendyol_barcode) {
  console.log(
    `Stok/fiyat push (write): atlandı — canlı yazma testi yapılmadı (örnek barkod: ${sample.trendyol_barcode}, stok: ${sample.stock_quantity})`,
  );
} else {
  console.log("Stok/fiyat push: atlandı (örnek ürün yok)");
}

const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
const { data: logs } = await admin
  .from("marketplace_sync_logs")
  .select("action,status,message,created_at")
  .eq("marketplace", "trendyol")
  .gte("created_at", since)
  .order("created_at", { ascending: false })
  .limit(10);

console.log("\nSon 14 gün sync logları:", logs?.length ?? 0);
for (const l of logs ?? []) {
  console.log(`  ${l.created_at} | ${l.status} | ${l.action} | ${String(l.message ?? "").slice(0, 100)}`);
}

const { count: mpCount } = await admin
  .from("marketplace_orders")
  .select("id", { count: "exact", head: true })
  .eq("marketplace", "trendyol");

console.log(`\nmarketplace_orders (trendyol) toplam: ${mpCount ?? 0}`);
