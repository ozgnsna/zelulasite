/**
 * Kaplama→renk turunda adı değişen ürünlerin Trendyol başlığını günceller.
 * Mevcut syncProductToTrendyol kullanır (yeni payload mantığı yok).
 *
 *   node scripts/push-renamed-titles-trendyol.mjs
 *   node scripts/push-renamed-titles-trendyol.mjs --apply
 *   node scripts/push-renamed-titles-trendyol.mjs --sku=Zelula415
 *   node scripts/push-renamed-titles-trendyol.mjs --apply --sku=Zelula415
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const SKU_FILTER = process.argv.find((a) => a.startsWith("--sku="))?.slice("--sku=".length) ?? null;
/** Trendyol rate limit — istekler arası bekleme */
const DELAY_MS = 2000;

/** Bu turda adı değişen 45 SKU (rename-plating-wording apply) */
const NAME_CHANGED_SKUS = [
  "Zelula102",
  "Zelula103",
  "Zelula208",
  "Zelula249",
  "Zelula250",
  "Zelula277",
  "Zelula286",
  "Zelula288",
  "Zelula295",
  "Zelula299",
  "Zelula319",
  "Zelula325",
  "Zelula33",
  "Zelula357",
  "Zelula358",
  "Zelula376",
  "Zelula377",
  "Zelula378",
  "Zelula379",
  "Zelula380",
  "Zelula381",
  "Zelula382",
  "Zelula383",
  "Zelula384",
  "Zelula385",
  "Zelula386",
  "Zelula387",
  "Zelula388",
  "Zelula389",
  "Zelula390",
  "Zelula400",
  "Zelula402",
  "Zelula403",
  "Zelula404",
  "Zelula405",
  "Zelula408",
  "Zelula409",
  "Zelula410",
  "Zelula412",
  "Zelula413",
  "Zelula414",
  "Zelula415",
  "Zelula416",
  "ZL-CLASSY-ZIRKON",
  "ZL-WILD-ZIRKON",
];

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
  };
}

async function fetchRemoteByBarcode(integration, barcode) {
  if (!barcode) return null;
  const sellerId = encodeURIComponent(integration.seller_id);
  const qs = new URLSearchParams({ barcode, size: "5", page: "0" });
  const url = `${tyBase(integration)}/integration/product/sellers/${sellerId}/products?${qs}`;
  const res = await fetch(url, { headers: tyHeaders(integration) });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    return { error: `HTTP ${res.status}`, title: null, onSale: null, quantity: null, approved: null };
  }
  const item = (body?.content ?? [])[0] ?? null;
  if (!item) return { error: null, title: null, onSale: null, quantity: null, approved: null, missing: true };
  return {
    error: null,
    missing: false,
    title: trim(item.title) || null,
    onSale: item.onSale ?? item.onsale ?? null,
    quantity: item.quantity ?? null,
    approved: item.approved ?? null,
    archived: item.archived ?? null,
    barcode: trim(item.barcode) || barcode,
  };
}

function loadSyncProductToTrendyol() {
  const require = createRequire(import.meta.url);
  const jitiFactory = require("jiti");
  const jiti = jitiFactory(path.join(ROOT, "scripts", "push-renamed-titles-trendyol.mjs"), {
    interopDefault: true,
    alias: { "@": path.join(ROOT, "src") },
  });
  const mod = jiti(path.join(ROOT, "src/lib/marketplaces/trendyol/products.ts"));
  if (typeof mod.syncProductToTrendyol !== "function") {
    throw new Error("syncProductToTrendyol yüklenemedi");
  }
  return mod.syncProductToTrendyol;
}

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: integration, error: intErr } = await admin
  .from("marketplace_integrations")
  .select("id,environment,seller_id,api_key,api_secret,is_active")
  .eq("marketplace", "trendyol")
  .maybeSingle();

if (intErr || !integration?.is_active || !integration.api_key || !integration.api_secret) {
  console.error("Trendyol entegrasyonu yok veya pasif.");
  process.exit(1);
}

let skuList = [...NAME_CHANGED_SKUS];
if (SKU_FILTER) skuList = skuList.filter((s) => s === SKU_FILTER);

const { data: products, error: prodErr } = await admin
  .from("products")
  .select(
    "id,sku,name,is_active,trendyol_active,trendyol_barcode,trendyol_stock_code,stock_quantity",
  )
  .in("sku", skuList)
  .eq("is_active", true)
  .eq("trendyol_active", true)
  .order("sku");

if (prodErr) {
  console.error(prodErr.message);
  process.exit(1);
}

const rows = products ?? [];
console.log(`MODE=${APPLY ? "APPLY" : "DRY_RUN"}`);
console.log(`Kapsam: adı değişen ∩ is_active ∩ trendyol_active → ${rows.length} ürün`);
if (SKU_FILTER) console.log(`Filtre: --sku=${SKU_FILTER}`);
console.log(`Gecikme: ${DELAY_MS}ms / istek`);
console.log("");
console.log("SKU\tyeni başlık (p.name)\teski TY başlığı\tTY onSale\tTY qty");

const plan = [];
for (let i = 0; i < rows.length; i += 1) {
  const p = rows[i];
  const barcode = trim(p.trendyol_barcode) || trim(p.sku);
  const remote = await fetchRemoteByBarcode(integration, barcode);
  const oldTitle = remote?.title ?? (remote?.missing ? "(TY'de bulunamadı)" : remote?.error ? `(çekilemedi: ${remote.error})` : "(yok)");
  const onSale = remote?.onSale == null ? "?" : String(remote.onSale);
  const qty = remote?.quantity == null ? "?" : String(remote.quantity);
  console.log([p.sku, p.name, oldTitle, onSale, qty].join("\t"));
  plan.push({
    id: p.id,
    sku: p.sku,
    newTitle: p.name,
    oldTitle,
    barcode,
    remote,
  });
  if (i < rows.length - 1) await sleep(DELAY_MS);
}

if (!APPLY) {
  console.log("\nDB/TY yazılmadı. Göndermek için: node scripts/push-renamed-titles-trendyol.mjs --apply");
  console.log(JSON.stringify({ mode: "DRY_RUN", count: plan.length, skus: plan.map((p) => p.sku) }, null, 2));
  process.exit(0);
}

async function fetchBatchOutcome(batchRequestId) {
  if (!batchRequestId) return { ok: false, message: "batchRequestId yok" };
  // Trendyol async işler — kısa poll
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await sleep(attempt === 0 ? 2500 : 1500);
    const sellerId = encodeURIComponent(integration.seller_id);
    const url = `${tyBase(integration)}/integration/product/sellers/${sellerId}/products/batch-requests/${encodeURIComponent(batchRequestId)}`;
    const res = await fetch(url, { headers: tyHeaders(integration) });
    const body = await res.json().catch(() => null);
    const status = String(body?.status ?? "");
    if (!status || status === "IN_PROGRESS" || status === "PENDING") continue;
    const items = Array.isArray(body?.items) ? body.items : [];
    const failed = items.filter((it) => String(it.status ?? "").toUpperCase() === "FAILED");
    const reasons = failed.flatMap((it) => {
      const fr = it.failureReasons;
      if (Array.isArray(fr)) return fr.map(String);
      if (fr) return [String(fr)];
      return [];
    });
    const failedCount = Number(body?.failedItemCount ?? failed.length);
    if (failedCount > 0 || failed.length > 0) {
      return {
        ok: false,
        message: reasons[0] || `batch FAILED (failedItemCount=${failedCount})`,
        batchStatus: status,
        batchRequestId,
      };
    }
    return { ok: true, message: `batch ${status}`, batchStatus: status, batchRequestId };
  }
  return { ok: false, message: "batch sonucu zaman aşımı / hâlâ IN_PROGRESS", batchRequestId };
}

const syncProductToTrendyol = loadSyncProductToTrendyol();
const results = [];

for (let i = 0; i < plan.length; i += 1) {
  const row = plan[i];
  process.stdout.write(`[${i + 1}/${plan.length}] ${row.sku} … `);
  try {
    const pr = await syncProductToTrendyol(admin, row.id);
    if (!pr.ok) {
      console.log(`HATA: ${pr.message || "bilinmeyen"}`);
      results.push({ sku: row.sku, ok: false, skipped: false, message: pr.message || "error" });
    } else if ("skipped" in pr && pr.skipped) {
      console.log(`SKIP: inactive veya credentials`);
      results.push({ sku: row.sku, ok: true, skipped: true, message: "skipped" });
    } else {
      const batchId = "batchRequestId" in pr ? pr.batchRequestId : null;
      const outcome = await fetchBatchOutcome(batchId);
      if (outcome.ok) {
        console.log(`OK ${outcome.message}`);
        results.push({ sku: row.sku, ok: true, skipped: false, message: outcome.message });
      } else {
        console.log(`HATA: ${outcome.message}`);
        results.push({ sku: row.sku, ok: false, skipped: false, message: outcome.message });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`HATA: ${msg}`);
    results.push({ sku: row.sku, ok: false, skipped: false, message: msg });
  }
  if (i < plan.length - 1) await sleep(DELAY_MS);
}

const ok = results.filter((r) => r.ok && !r.skipped).length;
const skipped = results.filter((r) => r.skipped).length;
const failed = results.filter((r) => !r.ok).length;
console.log("\n=== ÖZET ===");
console.log(JSON.stringify({ mode: "APPLY", total: results.length, ok, skipped, failed, results }, null, 2));
process.exit(failed > 0 ? 1 : 0);
