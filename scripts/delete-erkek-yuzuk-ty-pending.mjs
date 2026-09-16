/**
 * Zelula362–374 Trendyol onay bekleyen / reddedilen kayıtları siler.
 * Varsayılan: dry-run (yalnızca listeler). Gerçek silme: --apply
 *
 *   node scripts/delete-erkek-yuzuk-ty-pending.mjs
 *   node scripts/delete-erkek-yuzuk-ty-pending.mjs --apply
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const SKUS = Array.from({ length: 13 }, (_, i) => `Zelula${362 + i}`);
const DELETE_STATUSES = new Set(["pendingApproval", "rejected"]);

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
    storeFrontCode: "TR",
  };
}

async function tyRequest(integration, method, apiPath, body) {
  const url = `${tyBase(integration)}${apiPath}`;
  const res = await fetch(url, {
    method,
    headers: tyHeaders(integration),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text.slice(0, 500) };
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

async function fetchUnapproved(integration, productMainId, status) {
  const sellerId = encodeURIComponent(integration.seller_id);
  const qs = new URLSearchParams({ productMainId, status, size: "50", page: "0" });
  return tyRequest(
    integration,
    "GET",
    `/integration/product/sellers/${sellerId}/products/unapproved?${qs}`,
  );
}

async function deleteBarcodes(integration, barcodes) {
  const sellerId = encodeURIComponent(integration.seller_id);
  const items = barcodes.map((barcode) => ({ barcode }));
  return tyRequest(integration, "DELETE", `/integration/product/sellers/${sellerId}/products`, { items });
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: integration } = await admin
  .from("marketplace_integrations")
  .select("id,environment,seller_id,api_key,api_secret,is_active")
  .eq("marketplace", "trendyol")
  .maybeSingle();

if (!integration?.is_active) {
  console.error("Trendyol entegrasyonu aktif değil.");
  process.exit(1);
}

const targets = [];

for (const sku of SKUS) {
  for (const status of ["pendingApproval", "rejected"]) {
    const res = await fetchUnapproved(integration, sku, status);
    if (!res.ok) {
      console.error(`${sku} / ${status}: listeleme hatası HTTP ${res.status}`, res.body);
      continue;
    }
    for (const item of res.body?.content ?? []) {
      const barcode = trim(item.barcode);
      const itemStatus = trim(item.status);
      if (!barcode || !DELETE_STATUSES.has(itemStatus)) continue;
      targets.push({
        sku,
        barcode,
        status: itemStatus,
        title: trim(item.title),
        productMainId: trim(item.productMainId),
      });
    }
  }
}

const unique = [...new Map(targets.map((t) => [t.barcode, t])).values()].sort((a, b) =>
  a.barcode.localeCompare(b.barcode),
);

console.log(`Silinecek kayıt: ${unique.length}`);
for (const t of unique) {
  console.log(`  ${t.barcode} | ${t.status} | ${t.title}`);
}

if (unique.length === 0) {
  console.log("Silinecek onay bekleyen/reddedilen kayıt yok.");
  process.exit(0);
}

if (!APPLY) {
  console.log("\n[DRY-RUN] Silme yapılmadı. Gerçek silme için --apply ekleyin.");
  process.exit(0);
}

const CHUNK = 50;
const results = [];
for (let i = 0; i < unique.length; i += CHUNK) {
  const chunk = unique.slice(i, i + CHUNK);
  const barcodes = chunk.map((t) => t.barcode);
  const res = await deleteBarcodes(integration, barcodes);
  results.push({
    chunk: barcodes,
    ok: res.ok,
    status: res.status,
    body: res.body,
  });
  console.log(
    `Chunk ${Math.floor(i / CHUNK) + 1}: HTTP ${res.status} — ${barcodes.length} barkod — batch=${res.body?.batchRequestId ?? "?"}`,
  );
  if (!res.ok) console.log(JSON.stringify(res.body, null, 2));
}

for (const t of unique) {
  const { data: product } = await admin.from("products").select("id").eq("sku", t.sku).maybeSingle();
  if (!product?.id) continue;
  await admin.from("marketplace_sync_logs").insert({
    integration_id: integration.id,
    marketplace: "trendyol",
    entity_type: "product",
    entity_id: product.id,
    action: "product_delete_unapproved",
    status: results.some((r) => r.ok) ? "success" : "error",
    message: `Onay bekleyen/reddedilen TY kaydı silindi: ${t.barcode} (${t.status})`,
    response_payload: { barcode: t.barcode, status: t.status },
  });
}

console.log("\nÖzet:", JSON.stringify(results, null, 2));
