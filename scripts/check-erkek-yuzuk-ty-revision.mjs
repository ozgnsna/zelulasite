/**
 * Zelula362–374 Trendyol revize / red nedenlerini kontrol eder.
 *   node scripts/check-erkek-yuzuk-ty-revision.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SKUS = Array.from({ length: 13 }, (_, i) => `Zelula${362 + i}`);

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

async function tyGet(integration, path) {
  const url = `${tyBase(integration)}${path}`;
  const res = await fetch(url, { headers: tyHeaders(integration) });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return { ok: res.ok, status: res.status, body };
}

async function fetchUnapprovedByMainId(integration, productMainId, status) {
  const sellerId = encodeURIComponent(integration.seller_id);
  const qs = new URLSearchParams({
    productMainId,
    status,
    size: "50",
    page: "0",
  });
  return tyGet(integration, `/integration/product/sellers/${sellerId}/products/unapproved?${qs}`);
}

async function fetchProductByBarcode(integration, barcode) {
  const sellerId = encodeURIComponent(integration.seller_id);
  const qs = new URLSearchParams({ barcode, size: "5", page: "0" });
  return tyGet(integration, `/integration/product/sellers/${sellerId}/products?${qs}`);
}

function summarizeItem(item) {
  const reasons = Array.isArray(item.rejectReasonDetails) ? item.rejectReasonDetails : [];
  return {
    barcode: item.barcode,
    productMainId: item.productMainId,
    title: item.title,
    status: item.status,
    descriptionLen: trim(item.description).length,
    imageCount: Array.isArray(item.media) ? item.media.length : 0,
    rejectReasons: reasons.map((r) => ({
      reason: r.rejectReason,
      detail: r.rejectReasonDetail,
    })),
  };
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: integration } = await admin
  .from("marketplace_integrations")
  .select("environment,seller_id,api_key,api_secret,is_active")
  .eq("marketplace", "trendyol")
  .maybeSingle();

if (!integration?.is_active) {
  console.error("Trendyol entegrasyonu aktif değil.");
  process.exit(1);
}

const { data: products } = await admin
  .from("products")
  .select("id,sku,name,full_description,short_description,product_images(image_url)")
  .in("sku", SKUS)
  .order("sku");

const report = [];

for (const sku of SKUS) {
  const site = (products ?? []).find((p) => p.sku === sku);
  const entry = { sku, siteName: site?.name ?? null, variants: [] };

  for (const status of ["rejected", "pendingApproval"]) {
    const res = await fetchUnapprovedByMainId(integration, sku, status);
    const items = res.body?.content ?? [];
    for (const item of items) {
      entry.variants.push({ source: `unapproved/${status}`, ...summarizeItem(item) });
    }
  }

  for (const suffix of ["-10", "-11"]) {
    const barcode = `${sku}${suffix}`;
    const res = await fetchProductByBarcode(integration, barcode);
    const item = (res.body?.content ?? [])[0];
    if (item) {
      entry.variants.push({
        source: "catalog",
        barcode: item.barcode,
        productMainId: item.productMainId,
        title: item.title,
        status: item.rejected ? "rejected" : item.approved ? "approved" : "pending",
        approved: item.approved,
        onsale: item.onSale ?? item.onsale,
        rejected: item.rejected,
        rejectReason: item.rejectReason ?? item.rejectReasonDetail ?? null,
        descriptionLen: trim(item.description).length,
      });
    }
  }

  const uniqueReasons = new Map();
  for (const v of entry.variants) {
    for (const r of v.rejectReasons ?? []) {
      if (r.reason) uniqueReasons.set(r.reason, r.detail);
    }
    if (v.rejectReason) uniqueReasons.set(String(v.rejectReason), v.rejectReason);
  }
  entry.summaryReasons = [...uniqueReasons.entries()].map(([reason, detail]) => ({ reason, detail }));

  report.push(entry);
  const statusLine =
    entry.variants.length === 0
      ? "TY'de kayıt bulunamadı"
      : entry.summaryReasons.length > 0
        ? entry.summaryReasons.map((r) => r.reason).join(" | ")
        : entry.variants.map((v) => `${v.barcode}:${v.status ?? v.source}`).join(", ");
  console.log(`${sku}: ${statusLine}`);
}

console.log("\n=== DETAY ===\n");
console.log(JSON.stringify(report, null, 2));

const allReasons = new Map();
for (const r of report) {
  for (const reason of r.summaryReasons) {
    const key = reason.reason;
    allReasons.set(key, (allReasons.get(key) ?? 0) + 1);
  }
}
if (allReasons.size > 0) {
  console.log("\n=== ORTAK REVİZE NEDENLERİ ===");
  for (const [reason, count] of [...allReasons.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`- ${reason}: ${count} ürün`);
    const sample = report.find((r) => r.summaryReasons.some((x) => x.reason === reason));
    const detail = sample?.summaryReasons.find((x) => x.reason === reason)?.detail;
    if (detail) console.log(`  ${detail.slice(0, 300)}`);
  }
}
