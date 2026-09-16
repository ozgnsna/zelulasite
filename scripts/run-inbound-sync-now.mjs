/**
 * Trendyol inbound sipariş senkronu (doğru API yolu).
 *   node scripts/run-inbound-sync-now.mjs
 *   node scripts/run-inbound-sync-now.mjs --dry-run
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

const dryRun = process.argv.includes("--dry-run");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const STOCK_IMPACT = new Set(["created", "picking", "invoiced", "shipped", "delivered", "undelivered"]);
const STOCK_CANCEL = new Set(["cancelled", "canceled", "cancel", "returned", "refunded", "rejected", "unsupplied"]);

function trim(v) {
  return String(v ?? "").trim();
}

function normStatus(s) {
  return trim(s).toLocaleLowerCase("en-US");
}

function decideEffect(status) {
  const n = normStatus(status);
  if (STOCK_CANCEL.has(n)) return "restore";
  if (STOCK_IMPACT.has(n)) return "deduct";
  return "none";
}

function tyBase(integration) {
  return integration.environment === "prod" ? "https://apigw.trendyol.com" : "https://stageapigw.trendyol.com";
}

async function getIntegration() {
  const { data, error } = await admin
    .from("marketplace_integrations")
    .select("id,environment,seller_id,api_key,api_secret,is_active")
    .eq("marketplace", "trendyol")
    .maybeSingle();
  if (error) throw error;
  if (!data?.is_active) throw new Error("Trendyol entegrasyonu aktif değil.");
  return data;
}

async function tyFetch(integration, apiPath) {
  const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
  const endpoint = `${tyBase(integration)}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "User-Agent": `${integration.seller_id} - Zelula`,
    },
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text.slice(0, 400) };
  }
  if (!res.ok) throw new Error(`Trendyol GET ${apiPath} → ${res.status}: ${JSON.stringify(parsed).slice(0, 400)}`);
  return parsed;
}

function readWasDeducted(raw, previousStatus) {
  const payload = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const se = payload.stock_effect;
  if (se && typeof se === "object" && typeof se.applied === "boolean") return se.applied;
  return decideEffect(previousStatus) === "deduct";
}

async function applyOrderStockDelta(orders, mode) {
  if (orders.length === 0) return { updatedProductIds: [], unmatchedOrderItems: 0 };

  const allIdentifiers = new Set();
  for (const order of orders) {
    for (const line of order.lines) {
      for (const id of [line.barcode, line.stockCode].map(trim).filter(Boolean)) allIdentifiers.add(id);
    }
  }
  const keys = [...allIdentifiers];
  if (keys.length === 0) return { updatedProductIds: [], unmatchedOrderItems: 0 };

  const [byBarcode, byStockCode, bySku] = await Promise.all([
    admin.from("products").select("id,stock_quantity,trendyol_barcode,trendyol_stock_code,sku").in("trendyol_barcode", keys),
    admin.from("products").select("id,stock_quantity,trendyol_barcode,trendyol_stock_code,sku").in("trendyol_stock_code", keys),
    admin.from("products").select("id,stock_quantity,trendyol_barcode,trendyol_stock_code,sku").in("sku", keys),
  ]);

  const merged = [...(byBarcode.data ?? []), ...(byStockCode.data ?? []), ...(bySku.data ?? [])];
  const byIdentifier = new Map();
  const byId = new Map();
  for (const row of merged) {
    const id = trim(row.id);
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, { ...row, consumed: 0 });
    for (const val of [row.trendyol_barcode, row.trendyol_stock_code, row.sku]) {
      const k = trim(val);
      if (k && !byIdentifier.has(k)) byIdentifier.set(k, id);
    }
  }

  let unmatchedOrderItems = 0;
  for (const order of orders) {
    for (const line of order.lines) {
      const qty = line.quantity;
      if (qty <= 0) continue;
      const matchId = [line.barcode, line.stockCode].map(trim).filter(Boolean).map((k) => byIdentifier.get(k)).find(Boolean);
      if (!matchId) {
        unmatchedOrderItems += 1;
        console.log(`  ⚠ Eşleşmeyen: #${order.orderNumber} barcode=${line.barcode} qty=${qty}`);
        continue;
      }
      byId.get(matchId).consumed += qty;
    }
  }

  const updatedProductIds = [];
  for (const row of byId.values()) {
    if (row.consumed <= 0) continue;
    const current = Math.max(0, Math.trunc(Number(row.stock_quantity ?? 0)));
    const next = mode === "deduct" ? Math.max(0, current - row.consumed) : current + row.consumed;
    console.log(`  Stok ${mode}: ${trim(row.sku) || row.id} ${current} → ${next} (${mode === "deduct" ? "-" : "+"}${row.consumed})`);
    if (!dryRun) {
      await admin.from("products").update({ stock_quantity: next, is_active: next > 0 }).eq("id", row.id);
    }
    updatedProductIds.push(row.id);
  }

  return { updatedProductIds, unmatchedOrderItems };
}

async function main() {
  const integration = await getIntegration();
  const sellerId = encodeURIComponent(integration.seller_id);
  const start = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const end = Date.now();
  const body = await tyFetch(
    integration,
    `/integration/order/sellers/${sellerId}/orders?page=0&size=50&startDate=${start}&endDate=${end}`,
  );
  const rows = Array.isArray(body?.content) ? body.content : [];
  console.log(`${dryRun ? "[DRY-RUN] " : ""}Trendyol'dan ${rows.length} sipariş (son 2 gün).\n`);

  const externalIds = rows.map((r) => trim(r.orderNumber)).filter(Boolean);
  const { data: existingRows } = externalIds.length
    ? await admin
        .from("marketplace_orders")
        .select("external_order_id,order_status,raw_payload")
        .eq("marketplace", "trendyol")
        .in("external_order_id", externalIds)
    : { data: [] };

  const existingById = new Map(
    (existingRows ?? []).map((r) => [trim(r.external_order_id), { status: trim(r.order_status), raw: r.raw_payload }]),
  );

  const orders = rows.map((row) => ({
    orderNumber: trim(row.orderNumber),
    shipmentPackageStatus: trim(row.status) || "unknown",
    lines: (Array.isArray(row.lines) ? row.lines : []).map((line) => ({
      barcode: trim(line.barcode),
      stockCode: trim(line.stockCode ?? line.merchantSku),
      quantity: Math.max(0, Math.trunc(Number(line.quantity ?? 0))),
    })),
    raw: row,
  }));

  const deductOrders = [];
  const restoreOrders = [];
  let duplicateSkipped = 0;
  const now = new Date().toISOString();

  for (const order of orders) {
    const prev = existingById.get(order.orderNumber);
    const prevStatus = prev?.status ?? "";
    const prevDeducted = readWasDeducted(prev?.raw, prevStatus);
    const effect = decideEffect(order.shipmentPackageStatus);
    const shouldDeduct = effect === "deduct" && !prevDeducted;
    const shouldRestore = effect === "restore" && prevDeducted;
    if (!shouldDeduct && !shouldRestore && prev) duplicateSkipped += 1;

    const ts = order.raw?.orderDate ? new Date(Number(order.raw.orderDate)).toISOString() : "?";
    const barcodes = order.lines.map((l) => l.barcode).filter(Boolean).join(", ");
    console.log(
      `#${order.orderNumber} | ${order.shipmentPackageStatus} | ${ts} | ${shouldDeduct ? "→ DÜŞ" : shouldRestore ? "→ GERİ YÜKLE" : prev ? "atlandı" : "yeni kayıt"}`,
    );
    if (barcodes) console.log(`  barcodes: ${barcodes}`);

    if (shouldDeduct) deductOrders.push(order);
    if (shouldRestore) restoreOrders.push(order);

    if (!dryRun) {
      const applied = shouldDeduct ? true : shouldRestore ? false : prevDeducted;
      await admin.from("marketplace_orders").upsert(
        {
          integration_id: integration.id,
          marketplace: "trendyol",
          external_order_id: order.orderNumber,
          order_number: order.orderNumber,
          order_status: order.shipmentPackageStatus,
          raw_payload: {
            ...(typeof order.raw === "object" && order.raw ? order.raw : {}),
            stock_effect: {
              applied,
              last_mode: shouldDeduct ? "deduct" : shouldRestore ? "restore" : "none",
              previous_status: prevStatus || null,
              current_status: order.shipmentPackageStatus,
              updated_at: now,
            },
          },
          updated_at: now,
        },
        { onConflict: "marketplace,external_order_id" },
      );
    }
  }

  console.log(`\nDüşülecek: ${deductOrders.length}, geri yükleme: ${restoreOrders.length}, atlanan: ${duplicateSkipped}\n`);

  const deductResult = await applyOrderStockDelta(deductOrders, "deduct");
  const restoreResult = await applyOrderStockDelta(restoreOrders, "restore");

  console.log("\nÖzet:", {
    ordersFetched: orders.length,
    stockUpdates: deductResult.updatedProductIds.length + restoreResult.updatedProductIds.length,
    unmatchedOrderItems: deductResult.unmatchedOrderItems + restoreResult.unmatchedOrderItems,
    duplicateSkipped,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
