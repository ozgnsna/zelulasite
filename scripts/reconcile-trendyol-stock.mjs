/**
 * Trendyol stok senkronu:
 * 1) Son siparişleri çek → Zelula stoğunu düş/geri yükle → Trendyol'a push
 * 2) trendyol_active ürünlerde Zelula ≠ Trendyol ise Zelula stoğunu Trendyol'a gönder
 *
 * Usage:
 *   node scripts/reconcile-trendyol-stock.mjs --dry-run
 *   node scripts/reconcile-trendyol-stock.mjs
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

const root = process.cwd();
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

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

function firstVariant(item) {
  const variants = item?.variants;
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const v = variants[0];
  return v && typeof v === "object" ? v : null;
}

function extractBarcode(item) {
  return trim(item?.barcode) || trim(firstVariant(item)?.barcode);
}

function extractQty(item) {
  if (Number.isFinite(Number(item?.quantity))) return Math.max(0, Math.trunc(Number(item.quantity)));
  const stock = firstVariant(item)?.stock;
  if (stock && Number.isFinite(Number(stock.quantity))) {
    return Math.max(0, Math.trunc(Number(stock.quantity)));
  }
  return 0;
}

function tyBase(integration) {
  return integration.environment === "prod" ? "https://apigw.trendyol.com" : "https://stageapigw.trendyol.com";
}

function tyAuth(integration) {
  return Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
}

function tyHeaders(integration) {
  return {
    Authorization: `Basic ${tyAuth(integration)}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": `${integration.seller_id} - Self Integration`,
  };
}

async function getIntegration() {
  const { data, error } = await admin
    .from("marketplace_integrations")
    .select("id,environment,seller_id,supplier_id,api_key,api_secret,is_active")
    .eq("marketplace", "trendyol")
    .maybeSingle();
  if (error) throw error;
  if (!data?.is_active) throw new Error("Trendyol entegrasyonu aktif değil.");
  if (!data.seller_id || !data.api_key || !data.api_secret) {
    throw new Error("Trendyol API bilgileri eksik.");
  }
  return data;
}

async function tyFetch(integration, method, apiPath, body) {
  const endpoint = `${tyBase(integration)}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
  const res = await fetch(endpoint, {
    method,
    headers: tyHeaders(integration),
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text.slice(0, 400) };
  }
  if (!res.ok) {
    throw new Error(`Trendyol ${method} ${apiPath} → ${res.status}: ${JSON.stringify(parsed).slice(0, 400)}`);
  }
  return parsed;
}

async function fetchAllTrendyolProducts(integration) {
  const sellerId = encodeURIComponent(integration.seller_id);
  const all = [];
  for (const approved of [true, null]) {
    let page = 0;
    for (;;) {
      const q = approved === true ? "approved=true&" : "";
      const body = await tyFetch(
        integration,
        "GET",
        `/integration/product/sellers/${sellerId}/products?${q}size=200&page=${page}`,
      );
      const content = Array.isArray(body?.content) ? body.content : [];
      all.push(...content);
      if (content.length < 200) break;
      page += 1;
      if (page > 50) break;
    }
    if (all.length > 0) break;
  }

  const stockByKey = new Map();
  for (const item of all) {
    const barcode = extractBarcode(item);
    if (!barcode) continue;
    stockByKey.set(barcode, extractQty(item));
  }
  return { stockByKey, fetchedCount: all.length };
}

function readWasDeducted(raw, previousStatus) {
  const payload = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const se = payload.stock_effect;
  if (se && typeof se === "object" && typeof se.applied === "boolean") return se.applied;
  return decideEffect(previousStatus) === "deduct";
}

async function fetchAndApplyTrendyolOrders(integration) {
  const supplierId = encodeURIComponent(integration.supplier_id || integration.seller_id);
  const start = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const end = Date.now();
  const body = await tyFetch(
    integration,
    "GET",
    `/suppliers/${supplierId}/orders?page=0&size=50&startDate=${start}&endDate=${end}`,
  );
  const rows = Array.isArray(body?.content) ? body.content : [];
  console.log(`Trendyol'dan ${rows.length} sipariş satırı (son 3 gün).`);

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
    const applied = shouldDeduct ? true : shouldRestore ? false : prevDeducted;
    if (!shouldDeduct && !shouldRestore && prev) duplicateSkipped += 1;

    const baseRaw = prev?.raw && typeof prev.raw === "object" ? prev.raw : order.raw;
    const rawWithMarker = {
      ...(typeof baseRaw === "object" && baseRaw ? baseRaw : {}),
      stock_effect: {
        applied,
        last_mode: shouldDeduct ? "deduct" : shouldRestore ? "restore" : "none",
        previous_status: prevStatus || null,
        current_status: order.shipmentPackageStatus,
        updated_at: now,
      },
    };

    if (!dryRun) {
      await admin.from("marketplace_orders").upsert(
        {
          integration_id: integration.id,
          marketplace: "trendyol",
          external_order_id: order.orderNumber,
          order_number: order.orderNumber,
          order_status: order.shipmentPackageStatus,
          raw_payload: rawWithMarker,
          updated_at: now,
        },
        { onConflict: "marketplace,external_order_id" },
      );
    }

    if (shouldDeduct) deductOrders.push(order);
    if (shouldRestore) restoreOrders.push(order);
  }

  console.log(`  Yeni stok düşülecek sipariş: ${deductOrders.length}, iade/iptal geri yükleme: ${restoreOrders.length}, atlanan (zaten işlenmiş): ${duplicateSkipped}`);

  const deductResult = await applyOrderStockDelta(deductOrders, "deduct");
  const restoreResult = await applyOrderStockDelta(restoreOrders, "restore");

  return {
    ordersFetched: orders.length,
    deductOrders: deductOrders.length,
    restoreOrders: restoreOrders.length,
    duplicateSkipped,
    ...deductResult,
    restoredProducts: restoreResult.updatedCount,
    unmatchedOrderItems: deductResult.unmatchedOrderItems + restoreResult.unmatchedOrderItems,
  };
}

async function applyOrderStockDelta(orders, mode) {
  if (orders.length === 0) {
    return { updatedCount: 0, unmatchedOrderItems: 0, unmatchedUnits: 0, updatedProductIds: [] };
  }

  const allIdentifiers = new Set();
  for (const order of orders) {
    for (const line of order.lines) {
      for (const id of [line.barcode, line.stockCode].map(trim).filter(Boolean)) allIdentifiers.add(id);
    }
  }
  const keys = [...allIdentifiers];
  if (keys.length === 0) {
    return { updatedCount: 0, unmatchedOrderItems: 0, unmatchedUnits: 0, updatedProductIds: [] };
  }

  const [byBarcode, byStockCode, bySku] = await Promise.all([
    admin.from("products").select("id,stock_quantity,trendyol_barcode,trendyol_stock_code,sku,trendyol_active").in("trendyol_barcode", keys),
    admin.from("products").select("id,stock_quantity,trendyol_barcode,trendyol_stock_code,sku,trendyol_active").in("trendyol_stock_code", keys),
    admin.from("products").select("id,stock_quantity,trendyol_barcode,trendyol_stock_code,sku,trendyol_active").in("sku", keys),
  ]);

  const merged = [...(byBarcode.data ?? []), ...(byStockCode.data ?? []), ...(bySku.data ?? [])];
  const byIdentifier = new Map();
  const byId = new Map();

  for (const row of merged) {
    const id = trim(row.id);
    if (!id) continue;
    if (!byId.has(id)) {
      byId.set(id, { ...row, consumed: 0 });
    }
    for (const [key, val] of [
      ["trendyol_barcode", row.trendyol_barcode],
      ["trendyol_stock_code", row.trendyol_stock_code],
      ["sku", row.sku],
    ]) {
      const k = trim(val);
      if (k && !byIdentifier.has(k)) byIdentifier.set(k, id);
    }
  }

  let unmatchedUnits = 0;
  let unmatchedOrderItems = 0;
  for (const order of orders) {
    for (const line of order.lines) {
      const qty = line.quantity;
      if (qty <= 0) continue;
      const matchId = [line.barcode, line.stockCode].map(trim).filter(Boolean).map((k) => byIdentifier.get(k)).find(Boolean);
      if (!matchId) {
        unmatchedUnits += qty;
        unmatchedOrderItems += 1;
        console.log(`  ⚠ Eşleşmeyen satır: sipariş #${order.orderNumber} barcode=${line.barcode} stockCode=${line.stockCode} qty=${qty}`);
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
    console.log(`  Stok ${mode}: ${trim(row.sku) || row.id} ${current} → ${next} (-${row.consumed} adet)`);
    if (!dryRun) {
      await admin.from("products").update({ stock_quantity: next, is_active: next > 0 }).eq("id", row.id);
    }
    row.stock_quantity = next;
    updatedProductIds.push(row.id);
  }

  return { updatedCount: updatedProductIds.length, unmatchedOrderItems, unmatchedUnits, updatedProductIds };
}

function matchKeyForProduct(p, stockByKey) {
  return [p.trendyol_barcode, p.trendyol_stock_code, p.sku].map(trim).filter(Boolean).find((k) => stockByKey.has(k));
}

async function compareActiveProducts(stockByKey) {
  const { data: products } = await admin
    .from("products")
    .select(
      "id,name,sku,stock_quantity,price,trendyol_active,trendyol_barcode,trendyol_stock_code,trendyol_sale_price,trendyol_list_price",
    )
    .eq("trendyol_active", true);

  const mismatches = [];
  for (const p of products ?? []) {
    const key = matchKeyForProduct(p, stockByKey);
    if (!key) continue;
    const ty = stockByKey.get(key) ?? 0;
    const z = Math.max(0, Math.trunc(Number(p.stock_quantity ?? 0)));
    if (ty !== z) mismatches.push({ ...p, matchKey: key, zelula: z, trendyol: ty, delta: z - ty });
  }
  return { mismatches, activeCount: (products ?? []).length };
}

async function pushInventory(integration, products) {
  if (products.length === 0) return { ok: true, count: 0 };
  const supplierId = encodeURIComponent(integration.supplier_id || integration.seller_id);
  const payload = {
    items: products.map((p) => ({
      barcode: trim(p.trendyol_barcode) || trim(p.sku),
      quantity: Math.max(0, Math.trunc(Number(p.stock_quantity ?? 0))),
      salePrice: Number(p.trendyol_sale_price ?? p.price ?? 0),
      listPrice: Number(p.trendyol_list_price ?? p.trendyol_sale_price ?? p.price ?? 0),
    })),
  };

  if (dryRun) return { ok: true, count: products.length, dryRun: true };

  const body = await tyFetch(integration, "POST", `/suppliers/${supplierId}/products/price-and-inventory`, payload);
  return { ok: true, count: products.length, batchRequestId: body?.batchRequestId ?? null };
}

async function main() {
  console.log(dryRun ? "=== DRY RUN ===" : "=== Trendyol stok senkronu ===");

  const integration = await getIntegration();
  console.log(`Entegrasyon: ${integration.environment}, seller=${integration.seller_id}\n`);

  console.log("--- Adım 1: Trendyol siparişleri ---");
  let orderStats = null;
  try {
    orderStats = await fetchAndApplyTrendyolOrders(integration);
    console.log(JSON.stringify(orderStats, null, 2));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Sipariş çekimi atlandı: ${msg}`);
    console.warn("Stok push adımına devam ediliyor…");
  }

  console.log("\n--- Adım 2: Stok karşılaştırması (trendyol_active) ---");
  const { stockByKey } = await fetchAllTrendyolProducts(integration);
  let { mismatches, activeCount } = await compareActiveProducts(stockByKey);
  console.log(`Aktif Trendyol ürün: ${activeCount}, stok farkı: ${mismatches.length}`);

  if (mismatches.length > 0) {
    console.log("\nFarklı stoklar (Zelula → Trendyol gönderilecek, ilk 25):");
    for (const m of mismatches.slice(0, 25)) {
      console.log(
        `  ${m.sku ?? m.matchKey}: site=${m.zelula} TY=${m.trendyol} (site ${m.delta > 0 ? "+" : ""}${m.delta}) — ${trim(m.name).slice(0, 45)}`,
      );
    }
  }

  if (mismatches.length === 0) {
    console.log("\nTüm aktif ürünler Trendyol ile uyumlu.");
    return;
  }

  console.log("\n--- Adım 3: Zelula stokları Trendyol'a gönderiliyor ---");
  const toPush = mismatches;
  let pushed = 0;
  for (let i = 0; i < toPush.length; i += 100) {
    const chunk = toPush.slice(i, i + 100);
    const r = await pushInventory(integration, chunk);
    if (!r.ok) {
      console.error("Push hatası:", r.message);
      process.exit(1);
    }
    pushed += r.count;
    if (r.batchRequestId) console.log(`  Batch gönderildi: ${r.batchRequestId} (${chunk.length} ürün)`);
  }
  console.log(`Toplam ${pushed} ürün Trendyol'a gönderildi.`);

  if (!dryRun) {
    const after = await compareActiveProducts(stockByKey);
    console.log(`\nNot: Trendyol batch işlenene kadar API'de eski stok görünebilir. Kalan fark (anlık okuma): ${after.mismatches.length}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
