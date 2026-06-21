/**
 * Takılı hediye kartı siparişini tamamlar (PayTR 0 TL hatası sonrası).
 *   node scripts/complete-gift-card-order.mjs [orderId]
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(root, ".env.local"));

const orderId = process.argv[2] ?? "efebd2d2-e7e1-41c3-b87c-cc09c0378b24";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: order } = await admin
  .from("orders")
  .select("id,order_number,payment_status,total,gift_card_redeem_amount")
  .eq("id", orderId)
  .maybeSingle();

if (!order) {
  console.error("Sipariş bulunamadı:", orderId);
  process.exit(1);
}

if (order.payment_status === "paid") {
  console.log("Zaten ödendi:", order.order_number);
  process.exit(0);
}

if (Number(order.total ?? 0) > 0) {
  console.error("Sipariş tutarı sıfır değil; bu script yalnızca tam hediye kartı siparişleri içindir.");
  process.exit(1);
}

const callbackHash = `gift_card_full:${orderId}`;
const { data: existing } = await admin.from("payment_logs").select("id").eq("callback_hash", callbackHash).maybeSingle();
if (existing) {
  console.log("Zaten işlenmiş görünüyor.");
  process.exit(0);
}

await admin.from("orders").update({
  payment_status: "paid",
  order_status: "confirmed",
  payment_reference: `gift_card_full_${order.order_number}`,
  updated_at: new Date().toISOString(),
}).eq("id", orderId);

await admin.from("payment_logs").insert({
  order_id: orderId,
  provider: "gift_card",
  event_type: "callback",
  status: "success",
  callback_payload: { gift_card_covers_total: "1", manual_script: true },
  callback_hash: callbackHash,
  reference: `gift_card_full_${orderId}`,
  verification_status: "passed",
  processed_at: new Date().toISOString(),
});

const { data: hold } = await admin
  .from("gift_card_holds")
  .select("id,gift_card_id,amount_held,status")
  .eq("order_id", orderId)
  .maybeSingle();

if (hold?.status === "pending") {
  const amountHeld = Number(hold.amount_held);
  const { data: card } = await admin.from("gift_cards").select("id,balance_remaining,status").eq("id", hold.gift_card_id).maybeSingle();
  if (card) {
    const newBalance = Math.max(0, Number((Number(card.balance_remaining) - amountHeld).toFixed(2)));
    await admin.from("gift_card_ledger").insert({
      gift_card_id: hold.gift_card_id,
      order_id: orderId,
      amount: amountHeld,
      entry_type: "redeem",
      balance_after: newBalance,
      note: `Redeemed on gift-card-only order ${orderId}`,
    });
    await admin.from("gift_cards").update({
      balance_remaining: newBalance,
      status: newBalance <= 0 ? "depleted" : card.status,
      updated_at: new Date().toISOString(),
    }).eq("id", hold.gift_card_id);
    await admin.from("gift_card_holds").update({ status: "captured", released_at: null }).eq("id", hold.id);
  }
}

console.log("Tamamlandı:", order.order_number, orderId);
