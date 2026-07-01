/**
 * Acil stok push: trendyol_active + stock_quantity > 0
 *   node scripts/push-trendyol-active-stock.mjs
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

const CHUNK_SIZE = 100;

function trim(v) {
  return String(v ?? "").trim();
}

function tyBase(integration) {
  return integration.environment === "prod" ? "https://apigw.trendyol.com" : "https://stageapigw.trendyol.com";
}

function tyHeaders(integration) {
  const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
  return {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": `${integration.seller_id} - Self Integration`,
  };
}

async function pushChunk(integration, products) {
  const sellerId = encodeURIComponent(integration.seller_id);
  const payload = {
    items: products.map((p) => ({
      barcode: trim(p.trendyol_barcode) || trim(p.sku),
      quantity: Math.max(0, Math.trunc(Number(p.stock_quantity ?? 0))),
      salePrice: Number(p.trendyol_sale_price ?? p.price ?? 0),
      listPrice: Number(p.trendyol_list_price ?? p.trendyol_sale_price ?? p.price ?? 0),
    })),
  };
  const url = `${tyBase(integration)}/integration/inventory/sellers/${sellerId}/products/price-and-inventory`;
  const headers = { ...tyHeaders(integration), storeFrontCode: "TR" };
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 400) };
  }
  return { ok: res.ok, httpStatus: res.status, body, count: products.length };
}

const { data: integration, error: intErr } = await admin
  .from("marketplace_integrations")
  .select("id,environment,seller_id,supplier_id,api_key,api_secret,is_active")
  .eq("marketplace", "trendyol")
  .maybeSingle();

if (intErr || !integration?.is_active) {
  console.error("Trendyol entegrasyonu yok veya pasif.");
  process.exit(1);
}

const { data: products, error: prodErr } = await admin
  .from("products")
  .select(
    "id,sku,stock_quantity,price,trendyol_barcode,trendyol_sale_price,trendyol_list_price,trendyol_active",
  )
  .eq("trendyol_active", true)
  .gt("stock_quantity", 0);

if (prodErr) {
  console.error(prodErr.message);
  process.exit(1);
}

const eligible = (products ?? []).filter((p) => trim(p.trendyol_barcode) || trim(p.sku));
const skippedNoBarcode = (products ?? []).length - eligible.length;

console.log(
  JSON.stringify(
    {
      phase: "push_start",
      total_trendyol_active_with_stock: (products ?? []).length,
      eligible_with_barcode_or_sku: eligible.length,
      skipped_no_identifier: skippedNoBarcode,
      chunks: Math.ceil(eligible.length / CHUNK_SIZE),
    },
    null,
    2,
  ),
);

let pushed = 0;
let succeeded = 0;
let failed = 0;
const errors = [];

for (let i = 0; i < eligible.length; i += CHUNK_SIZE) {
  const chunk = eligible.slice(i, i + CHUNK_SIZE);
  const chunkNo = Math.floor(i / CHUNK_SIZE) + 1;
  const result = await pushChunk(integration, chunk);
  pushed += result.count;
  if (result.ok) {
    succeeded += result.count;
    console.log(
      `Chunk ${chunkNo}: OK HTTP ${result.httpStatus} — ${result.count} ürün, batchRequestId=${result.body?.batchRequestId ?? "?"}`,
    );
    await admin.from("marketplace_sync_logs").insert({
      integration_id: integration.id,
      marketplace: "trendyol",
      entity_type: "inventory",
      action: "emergency_stock_push",
      status: "pending",
      message: `Acil stok push chunk ${chunkNo}: ${result.count} ürün gönderildi.`,
      batch_request_id: result.body?.batchRequestId ?? null,
      metadata: {
        ran_at: new Date().toISOString(),
        affected_count: result.count,
        chunk: chunkNo,
        http_status: result.httpStatus,
      },
      response_payload: result.body,
    });
  } else {
    failed += result.count;
    const errMsg = JSON.stringify(result.body).slice(0, 500);
    errors.push({ chunk: chunkNo, httpStatus: result.httpStatus, message: errMsg });
    console.error(`Chunk ${chunkNo}: FAIL HTTP ${result.httpStatus} — ${errMsg}`);
    await admin.from("marketplace_sync_logs").insert({
      integration_id: integration.id,
      marketplace: "trendyol",
      entity_type: "inventory",
      action: "emergency_stock_push",
      status: "error",
      message: `Acil stok push chunk ${chunkNo} başarısız: HTTP ${result.httpStatus}`,
      metadata: {
        ran_at: new Date().toISOString(),
        affected_count: result.count,
        error_message: errMsg,
        chunk: chunkNo,
        http_status: result.httpStatus,
      },
      response_payload: result.body,
    });
  }
}

console.log(
  JSON.stringify(
    {
      phase: "push_complete",
      pushed,
      succeeded,
      failed,
      skipped_no_identifier: skippedNoBarcode,
      errors,
    },
    null,
    2,
  ),
);
