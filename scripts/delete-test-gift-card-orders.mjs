/**
 * Test hediye kartı siparişlerini ve bağlı kartları siler.
 * Varsayılan: dry-run (yalnızca listeler). Gerçek silme: --apply
 *
 *   node scripts/delete-test-gift-card-orders.mjs
 *   node scripts/delete-test-gift-card-orders.mjs --apply
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

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

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function isTestPaymentLog(log) {
  const payload = log.callback_payload;
  if (payload && typeof payload === "object") {
    if (payload.test_script === "test-gift-card-purchase.mjs") return true;
    if (payload.manual === "1" && String(log.reference ?? "").startsWith("test_paytr_")) return true;
  }
  if (String(log.reference ?? "").startsWith("test_paytr_")) return true;
  if (String(log.callback_hash ?? "").startsWith("test_gift_card_purchase:")) return true;
  return false;
}

function isTestOrder(order) {
  if (String(order.payment_reference ?? "").startsWith("test_paytr_")) return true;
  const note = order.shipping_address_json?.delivery_note;
  if (note === "TEST_GIFT_CARD_PURCHASE") return true;
  return false;
}

const { data: paymentLogs, error: logErr } = await admin
  .from("payment_logs")
  .select("id,order_id,reference,callback_hash,callback_payload,created_at");

if (logErr) throw logErr;

const testOrderIdsFromLogs = new Set(
  (paymentLogs ?? []).filter(isTestPaymentLog).map((l) => l.order_id).filter(Boolean),
);

const { data: giftOrders, error: orderErr } = await admin
  .from("orders")
  .select(
    "id,order_number,payment_status,total,email,payment_reference,shipping_address_json,created_at,order_items(id,gift_card_meta,product:product_id(product_kind))",
  )
  .order("created_at", { ascending: false });

if (orderErr) throw orderErr;

const candidates = [];
for (const order of giftOrders ?? []) {
  const items = order.order_items ?? [];
  const hasGiftLine = items.some((it) => {
    const p = Array.isArray(it.product) ? it.product[0] : it.product;
    return p?.product_kind === "gift_card" || it.gift_card_meta;
  });
  if (!hasGiftLine) continue;

  const reasons = [];
  if (testOrderIdsFromLogs.has(order.id)) reasons.push("test_payment_log");
  if (isTestOrder(order)) reasons.push("test_order_fields");

  if (reasons.length > 0) {
    candidates.push({ order, reasons });
  }
}

if (candidates.length === 0) {
  console.log("Silinecek test hediye kartı siparişi bulunamadı.");
  process.exit(0);
}

console.log(`Bulunan test hediye kartı siparişi: ${candidates.length}\n`);
for (const { order, reasons } of candidates) {
  console.log(
    `- ${order.order_number} | ${order.created_at?.slice(0, 19)} | ${order.payment_status} | ${order.total}₺ | ${order.email} | ${reasons.join(", ")}`,
  );
}

const orderIds = candidates.map((c) => c.order.id);

const { data: cards } = await admin
  .from("gift_cards")
  .select("id,code_last4,balance_remaining,status,recipient_email,purchase_order_id,created_at")
  .in("purchase_order_id", orderIds);

console.log(`\nBağlı hediye kartı: ${cards?.length ?? 0}`);
for (const c of cards ?? []) {
  console.log(
    `  card ${c.id.slice(0, 8)}… | last4=${c.code_last4} | ${c.balance_remaining}₺ | ${c.recipient_email}`,
  );
}

const { data: holds } = await admin
  .from("gift_card_holds")
  .select("id,order_id,amount_held,status")
  .in("order_id", orderIds);

console.log(`Bekleyen hold: ${holds?.length ?? 0}`);

const testLogIds = (paymentLogs ?? [])
  .filter((l) => l.order_id && orderIds.includes(l.order_id) && isTestPaymentLog(l))
  .map((l) => l.id);

if (!APPLY) {
  console.log("\n[DRY-RUN] Silme yapılmadı. Gerçek silme için --apply ekleyin.");
  console.log(
    JSON.stringify(
      {
        orders: candidates.map((c) => c.order.order_number),
        orderIds,
        giftCardIds: (cards ?? []).map((c) => c.id),
        paymentLogIds: testLogIds,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const cardIds = (cards ?? []).map((c) => c.id);

if (cardIds.length > 0) {
  const { error } = await admin.from("gift_cards").delete().in("id", cardIds);
  if (error) throw new Error(`gift_cards silinemedi: ${error.message}`);
  console.log(`✓ ${cardIds.length} hediye kartı silindi`);
}

if (testLogIds.length > 0) {
  const { error } = await admin.from("payment_logs").delete().in("id", testLogIds);
  if (error) throw new Error(`payment_logs silinemedi: ${error.message}`);
  console.log(`✓ ${testLogIds.length} payment_log silindi`);
}

const remainingLogs = (paymentLogs ?? [])
  .filter((l) => l.order_id && orderIds.includes(l.order_id))
  .map((l) => l.id);
if (remainingLogs.length > 0) {
  const { error } = await admin.from("payment_logs").delete().in("id", remainingLogs);
  if (error) throw new Error(`kalan payment_logs silinemedi: ${error.message}`);
  console.log(`✓ ${remainingLogs.length} ek payment_log silindi`);
}

const { error: orderDeleteErr } = await admin.from("orders").delete().in("id", orderIds);
if (orderDeleteErr) throw new Error(`orders silinemedi: ${orderDeleteErr.message}`);

console.log(`✓ ${orderIds.length} sipariş silindi`);
console.log(
  JSON.stringify(
    {
      deletedOrders: candidates.map((c) => c.order.order_number),
      deletedGiftCards: cardIds.length,
    },
    null,
    2,
  ),
);
