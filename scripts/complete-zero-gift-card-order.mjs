/**
 * 0 TL hediye kartı siparişini applyPaymentResult ile tamamlar.
 *   node scripts/complete-zero-gift-card-order.mjs [orderId]
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(root, ".env.local"));

const orderId = process.argv[2] ?? "f3dc93b6-8dc1-41ba-bc1e-704dfa9ceffc";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: order } = await admin
  .from("orders")
  .select("id,order_number,payment_status,total,gift_card_redeem_amount")
  .eq("id", orderId)
  .maybeSingle();

if (!order) {
  console.error("Sipariş bulunamadı");
  process.exit(1);
}

if (order.payment_status === "paid") {
  console.log("Zaten ödendi:", order.order_number);
  process.exit(0);
}

if (Number(order.total ?? 0) > 0) {
  console.error("Sipariş tutarı sıfır değil:", order.total);
  process.exit(1);
}

const callbackHash = `gift_card_full:${orderId}`;
const { data: existing } = await admin.from("payment_logs").select("id").eq("callback_hash", callbackHash).maybeSingle();
if (existing) {
  console.log("Callback zaten var, sipariş durumunu kontrol edin.");
}

await admin.from("payment_logs").insert({
  order_id: orderId,
  provider: "gift_card",
  event_type: "callback",
  status: "success",
  callback_payload: { gift_card_covers_total: "1", manual_repair: true, reason: "bank_transfer_zero_total" },
  callback_hash: callbackHash,
  reference: `gift_card_full_${orderId}`,
  verification_status: "passed",
  processed_at: new Date().toISOString(),
}).then(({ error }) => {
  if (error?.code === "23505") return;
  if (error) throw error;
});

await admin
  .from("orders")
  .update({
    payment_status: "paid",
    order_status: "confirmed",
    payment_provider: "gift_card",
    payment_reference: `gift_card_full_${order.order_number}`,
    updated_at: new Date().toISOString(),
  })
  .eq("id", orderId);

// Gift card capture (from redeem.ts logic)
const { data: hold } = await admin
  .from("gift_card_holds")
  .select("id,gift_card_id,amount_held,status")
  .eq("order_id", orderId)
  .maybeSingle();

if (hold?.status === "pending") {
  const amountHeld = Number(hold.amount_held);
  const { data: card } = await admin
    .from("gift_cards")
    .select("id,balance_remaining,status")
    .eq("id", hold.gift_card_id)
    .maybeSingle();
  if (card) {
    const newBalance = Math.max(0, Number((Number(card.balance_remaining) - amountHeld).toFixed(2)));
    await admin.from("gift_card_ledger").insert({
      gift_card_id: hold.gift_card_id,
      order_id: orderId,
      amount: amountHeld,
      entry_type: "redeem",
      balance_after: newBalance,
      note: `Redeemed on order ${order.order_number}`,
    });
    await admin
      .from("gift_cards")
      .update({
        balance_remaining: newBalance,
        status: newBalance <= 0 ? "depleted" : card.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", hold.gift_card_id);
    await admin
      .from("gift_card_holds")
      .update({ status: "captured", released_at: null })
      .eq("id", hold.id);
  }
}

// Stock delta
const { data: rows } = await admin
  .from("order_items")
  .select("product_id,variant_id,quantity")
  .eq("order_id", orderId);

const qtyByProduct = new Map();
const qtyByVariant = new Map();
for (const row of rows ?? []) {
  const productId = String(row.product_id ?? "").trim();
  if (!productId) continue;
  const qty = Number(row.quantity ?? 0);
  if (!Number.isFinite(qty) || qty <= 0) continue;
  const variantId = String(row.variant_id ?? "").trim();
  if (variantId) {
    qtyByVariant.set(variantId, (qtyByVariant.get(variantId) ?? 0) + qty);
  } else {
    qtyByProduct.set(productId, (qtyByProduct.get(productId) ?? 0) + qty);
  }
}

const variantIds = [...qtyByVariant.keys()];
const productsWithVariantSale = new Set();
if (variantIds.length > 0) {
  const { data: variantRows } = await admin
    .from("product_variants")
    .select("id,product_id,stock_quantity")
    .in("id", variantIds);
  for (const v of variantRows ?? []) {
    const vid = String(v.id ?? "");
    const current = Number(v.stock_quantity ?? 0);
    const delta = qtyByVariant.get(vid) ?? 0;
    await admin
      .from("product_variants")
      .update({ stock_quantity: Math.max(0, current - delta) })
      .eq("id", vid);
    const pid = String(v.product_id ?? "");
    if (pid) productsWithVariantSale.add(pid);
  }
}

const productIds = [...new Set([...qtyByProduct.keys(), ...productsWithVariantSale])];
if (productIds.length > 0) {
  const { data: products } = await admin
    .from("products")
    .select("id,stock_quantity,product_kind")
    .in("id", productIds);

  for (const p of products ?? []) {
    if (p.product_kind === "gift_card") continue;
    const id = String(p.id ?? "");
    let next;
    if (productsWithVariantSale.has(id)) {
      const { data: allVariants } = await admin
        .from("product_variants")
        .select("stock_quantity,is_active")
        .eq("product_id", id);
      next = (allVariants ?? [])
        .filter((v) => v.is_active !== false)
        .reduce((s, v) => s + Math.max(0, Number(v.stock_quantity ?? 0)), 0);
    } else {
      next = Math.max(0, Number(p.stock_quantity ?? 0) - (qtyByProduct.get(id) ?? 0));
    }
    await admin.from("products").update({ stock_quantity: next, is_active: next > 0 }).eq("id", id);
  }
}

console.log("Tamamlandı:", order.order_number, orderId);
