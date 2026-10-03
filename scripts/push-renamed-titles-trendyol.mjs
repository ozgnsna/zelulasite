/**
 * Kaplama→renk turunda adı değişen ürünlerin Trendyol başlığını günceller.
 * Yol: content-bulk-update (contentId + title only). Create POST YASAK.
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
/** update-audits QC limiti 100/dk → audit çağrıları arası min boşluk */
const AUDIT_MIN_GAP_MS = 700;

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

function loadContentUpdateApi() {
  const require = createRequire(import.meta.url);
  const jitiFactory = require("jiti");
  const jiti = jitiFactory(path.join(ROOT, "scripts", "push-renamed-titles-trendyol.mjs"), {
    interopDefault: true,
    alias: { "@": path.join(ROOT, "src") },
  });
  const mod = jiti(path.join(ROOT, "src/lib/marketplaces/trendyol/content-update.ts"));
  for (const name of [
    "resolveTrendyolListing",
    "updateTrendyolProductContent",
    "awaitTrendyolBatch",
    "getTrendyolContentUpdateAudits",
    "waitForTrendyolTitleAudit",
  ]) {
    if (typeof mod[name] !== "function") {
      throw new Error(`${name} yüklenemedi`);
    }
  }
  return mod;
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

const {
  resolveTrendyolListing,
  updateTrendyolProductContent,
  awaitTrendyolBatch,
  waitForTrendyolTitleAudit,
} = loadContentUpdateApi();

const rows = products ?? [];
console.log(`MODE=${APPLY ? "APPLY" : "DRY_RUN"}`);
console.log(`Yol: content-bulk-update (title-only) — create POST yok`);
console.log(`Kapsam: adı değişen ∩ is_active ∩ trendyol_active → ${rows.length} ürün`);
if (SKU_FILTER) console.log(`Filtre: --sku=${SKU_FILTER}`);
console.log(`Gecikme: ${DELAY_MS}ms / istek`);
console.log("");
console.log("SKU\tcontentId\tTY başlığı\tyeni başlık");

const plan = [];
for (let i = 0; i < rows.length; i += 1) {
  const p = rows[i];
  const barcode = trim(p.trendyol_barcode) || trim(p.sku);
  let listing = null;
  let errMsg = null;
  try {
    listing = await resolveTrendyolListing(integration, barcode);
  } catch (err) {
    errMsg = err instanceof Error ? err.message : String(err);
  }
  const contentId = listing?.contentId != null ? String(listing.contentId) : errMsg ? `(hata)` : "(yok)";
  const tyTitle = listing?.title || (errMsg ? `(çekilemedi: ${errMsg.slice(0, 80)})` : "(TY'de bulunamadı)");
  console.log([p.sku, contentId, tyTitle, p.name].join("\t"));
  plan.push({
    id: p.id,
    sku: p.sku,
    newTitle: p.name,
    barcode,
    listing,
    errMsg,
  });
  if (i < rows.length - 1) await sleep(DELAY_MS);
}

if (!APPLY) {
  console.log("\nDB/TY yazılmadı. Göndermek için: node scripts/push-renamed-titles-trendyol.mjs --apply");
  console.log(
    JSON.stringify(
      {
        mode: "DRY_RUN",
        count: plan.length,
        withContentId: plan.filter((p) => p.listing?.contentId).length,
        skus: plan.map((p) => p.sku),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const results = [];

for (let i = 0; i < plan.length; i += 1) {
  const row = plan[i];
  process.stdout.write(`[${i + 1}/${plan.length}] ${row.sku} … `);

  if (!row.listing?.contentId) {
    const msg = row.errMsg || "contentId yok / TY listing bulunamadı";
    console.log(`HATA: ${msg}`);
    results.push({ sku: row.sku, ok: false, message: msg });
    if (i < plan.length - 1) await sleep(DELAY_MS);
    continue;
  }

  if (trim(row.listing.title) === trim(row.newTitle)) {
    console.log(`SKIP: başlık zaten aynı (contentId=${row.listing.contentId})`);
    results.push({
      sku: row.sku,
      ok: true,
      skipped: true,
      contentId: row.listing.contentId,
      message: "already_same_title",
    });
    if (i < plan.length - 1) await sleep(DELAY_MS);
    continue;
  }

  try {
    const upd = await updateTrendyolProductContent(
      integration,
      { contentId: row.listing.contentId, title: row.newTitle },
      { admin, productId: row.id },
    );
    if (!upd.ok) {
      console.log(`HATA: ${upd.message}`);
      results.push({
        sku: row.sku,
        ok: false,
        contentId: row.listing.contentId,
        message: upd.message,
      });
      if (i < plan.length - 1) await sleep(DELAY_MS);
      continue;
    }

    const batch = await awaitTrendyolBatch(integration, upd.batchRequestId);
    if (!batch.ok) {
      console.log(`HATA: batch ${batch.message}`);
      results.push({
        sku: row.sku,
        ok: false,
        contentId: row.listing.contentId,
        batchRequestId: upd.batchRequestId,
        message: batch.message,
      });
      if (i < plan.length - 1) await sleep(DELAY_MS);
      continue;
    }

    // QC audit — TITLE; RUNNING/yok iken poll (100/dk gap waitFor içinde)
    const want = trim(row.newTitle);
    const auditWait = await waitForTrendyolTitleAudit(integration, row.listing.contentId, {
      expectedTitle: want,
      batchRequestId: upd.batchRequestId,
      maxAttempts: 12,
      pollDelayMs: 5000,
      minGapMs: AUDIT_MIN_GAP_MS,
    });
    const titleAudit = auditWait.audit;

    // Listing bazen audit SUCCESS sonrası kısa gecikir — birkaç kez dene
    let titleNow = "";
    for (let t = 0; t < 4; t += 1) {
      if (t > 0) await sleep(2000);
      const after = await resolveTrendyolListing(integration, row.barcode);
      titleNow = trim(after?.title);
      if (titleNow === want) break;
    }

    if (!auditWait.ok && titleAudit?.status === "FAIL") {
      const rejectType = titleAudit.rejectReasons?.[0]?.type || "TITLE_FAIL";
      console.log(`HATA: audit FAIL (${rejectType}) — ${auditWait.message.slice(0, 120)}`);
      results.push({
        sku: row.sku,
        ok: false,
        contentId: row.listing.contentId,
        batchRequestId: upd.batchRequestId,
        auditStatus: titleAudit.status,
        rejectType,
        message: auditWait.message,
        tyTitleAfter: titleNow || null,
      });
    } else if (titleNow !== want) {
      console.log(
        `HATA: batch ${batch.apiStatus} ama başlık eşleşmedi (audit=${titleAudit?.status ?? "yok"})`,
      );
      results.push({
        sku: row.sku,
        ok: false,
        contentId: row.listing.contentId,
        batchRequestId: upd.batchRequestId,
        auditStatus: titleAudit?.status ?? null,
        message: "title_mismatch_after_update",
        tyTitleAfter: titleNow || null,
        expected: want,
      });
    } else {
      console.log(
        `OK contentId=${row.listing.contentId} batch=${batch.apiStatus} audit=${titleAudit?.status ?? "pending"}`,
      );
      results.push({
        sku: row.sku,
        ok: true,
        skipped: false,
        contentId: row.listing.contentId,
        batchRequestId: upd.batchRequestId,
        auditStatus: titleAudit?.status ?? null,
        message: `batch ${batch.apiStatus}`,
        tyTitleAfter: titleNow,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`HATA: ${msg}`);
    results.push({
      sku: row.sku,
      ok: false,
      contentId: row.listing?.contentId,
      message: msg,
    });
  }

  if (i < plan.length - 1) await sleep(DELAY_MS);
}

const ok = results.filter((r) => r.ok && !r.skipped).length;
const skipped = results.filter((r) => r.skipped).length;
const failed = results.filter((r) => !r.ok).length;
console.log("\n=== ÖZET ===");
console.log(JSON.stringify({ mode: "APPLY", total: results.length, ok, skipped, failed, results }, null, 2));
process.exit(failed > 0 ? 1 : 0);
