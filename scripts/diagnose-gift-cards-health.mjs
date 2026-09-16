/**
 * Dijital hediye kartı sağlık kontrolü
 *   node scripts/diagnose-gift-cards-health.mjs
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

const pepper = process.env.GIFT_CARD_CODE_PEPPER?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "zelula-gift-card-dev-pepper";

console.log("=== Hediye kartı sağlık kontrolü ===\n");
console.log("Pepper:", process.env.GIFT_CARD_CODE_PEPPER?.trim() ? "GIFT_CARD_CODE_PEPPER" : "SERVICE_ROLE fallback");

const { data: denoms, error: denomErr } = await admin
  .from("gift_card_denominations")
  .select("id,amount,currency,label,slug,is_active,product_id,image_url,sort_order,products:product_id(id,slug,name,is_active,product_kind,price)")
  .order("sort_order");

if (denomErr) {
  console.error("denominations error:", denomErr.message);
  process.exit(1);
}

console.log("\n--- Yüz değerleri ---");
const denomIssues = [];
for (const d of denoms ?? []) {
  const p = Array.isArray(d.products) ? d.products[0] : d.products;
  const ok =
    d.is_active &&
    p?.is_active !== false &&
    p?.product_kind === "gift_card" &&
    Number(p?.price) === Number(d.amount);
  const status = ok ? "OK" : "SORUN";
  if (!ok) denomIssues.push(d.slug);
  console.log(
    `${status} | ${d.label} (${d.amount}₺) | active=${d.is_active} | product=${p?.slug ?? "YOK"} kind=${p?.product_kind ?? "?"} price=${p?.price ?? "?"} | img=${d.image_url ? "var" : "yok"}`,
  );
}

const { data: cards, error: cardErr } = await admin
  .from("gift_cards")
  .select("id,status,balance_remaining,initial_balance,code_last4,recipient_email,delivered_at,delivery_attempts,expires_at,created_at,purchase_order_id")
  .order("created_at", { ascending: false })
  .limit(30);

if (cardErr) {
  console.error("gift_cards error:", cardErr.message);
  process.exit(1);
}

const now = Date.now();
const stats = { active: 0, depleted: 0, expired: 0, undelivered: 0, zeroBalance: 0 };
for (const c of cards ?? []) {
  if (c.status === "active") stats.active++;
  if (c.status === "depleted") stats.depleted++;
  if (c.expires_at && new Date(c.expires_at).getTime() <= now) stats.expired++;
  if (!c.delivered_at && c.delivery_attempts >= 1) stats.undelivered++;
  if (Number(c.balance_remaining) <= 0) stats.zeroBalance++;
}

console.log("\n--- Son 30 kart özeti ---");
console.log(JSON.stringify(stats, null, 2));

const undelivered = (cards ?? []).filter((c) => !c.delivered_at);
if (undelivered.length) {
  console.log("\nTeslim edilmemiş (delivered_at null):");
  for (const c of undelivered.slice(0, 10)) {
    console.log(`  ${c.created_at?.slice(0, 10)} | ${c.recipient_email} | last4=${c.code_last4} | attempts=${c.delivery_attempts} | status=${c.status}`);
  }
}

const { data: pendingHolds } = await admin
  .from("gift_card_holds")
  .select("id,order_id,amount_held,status,expires_at,created_at")
  .eq("status", "pending");

console.log(`\n--- Bekleyen hold: ${pendingHolds?.length ?? 0} ---`);
for (const h of pendingHolds ?? []) {
  const expired = h.expires_at && new Date(h.expires_at).getTime() < now;
  console.log(`  order=${String(h.order_id).slice(0, 8)}… amount=${h.amount_held} expires=${h.expires_at} ${expired ? "(SÜRESİ DOLMUŞ)" : ""}`);
}

const { data: giftOrders } = await admin
  .from("orders")
  .select("id,order_number,payment_status,total,gift_card_redeem_amount,created_at,order_items(id,gift_card_meta,product:product_id(product_kind))")
  .order("created_at", { ascending: false })
  .limit(50);

const paidGiftPurchases = [];
const paidWithRedeem = [];
for (const o of giftOrders ?? []) {
  const items = o.order_items ?? [];
  const hasGiftPurchase = items.some((it) => {
    const p = Array.isArray(it.product) ? it.product[0] : it.product;
    return p?.product_kind === "gift_card" || it.gift_card_meta;
  });
  if (hasGiftPurchase && o.payment_status === "paid") paidGiftPurchases.push(o);
  if (Number(o.gift_card_redeem_amount) > 0 && o.payment_status === "paid") paidWithRedeem.push(o);
}

console.log(`\n--- Son 50 siparişte ödenmiş hediye kartı satın alma: ${paidGiftPurchases.length} ---`);
for (const o of paidGiftPurchases.slice(0, 8)) {
  const { count } = await admin
    .from("gift_cards")
    .select("id", { count: "exact", head: true })
    .eq("purchase_order_id", o.id);
  const issued = count ?? 0;
  const itemCount = (o.order_items ?? []).filter((it) => it.gift_card_meta || (Array.isArray(it.product) ? it.product[0] : it.product)?.product_kind === "gift_card").length;
  const ok = issued >= itemCount;
  console.log(
    `${ok ? "OK" : "EKSİK KART"} | ${o.order_number} | ${o.created_at?.slice(0, 10)} | issued=${issued} lines=${itemCount}`,
  );
}

console.log(`\n--- Ödenmiş siparişlerde hediye kartı kullanımı: ${paidWithRedeem.length} ---`);
for (const o of paidWithRedeem.slice(0, 5)) {
  console.log(`  ${o.order_number} | redeem=${o.gift_card_redeem_amount}₺ | total=${o.total}₺`);
}

const { data: imgCheck } = await admin.storage.from("product-images").list("", { search: "zelula-gift-card" });
const hasStorageImg = (imgCheck ?? []).some((f) => f.name?.includes("gift-card"));

console.log("\n--- Görsel ---");
console.log("Storage zelula-gift-card:", hasStorageImg ? "var" : "bulunamadı");

const issues = [];
if (denomIssues.length) issues.push(`${denomIssues.length} yüz değeri yapılandırma sorunu`);
if (stats.undelivered > 0) issues.push(`${stats.undelivered} kart e-posta teslim sorunu`);
if ((pendingHolds ?? []).some((h) => h.expires_at && new Date(h.expires_at).getTime() < now)) {
  issues.push("süresi dolmuş bekleyen hold var");
}

const { count: totalCards } = await admin.from("gift_cards").select("id", { count: "exact", head: true });
const { data: allUndelivered } = await admin
  .from("gift_cards")
  .select("id,recipient_email,delivered_at,delivery_attempts,status,created_at,purchase_order_id")
  .is("delivered_at", null);

const { data: purchaseLines } = await admin
  .from("order_items")
  .select("id,order_id,gift_card_meta,orders(order_number,payment_status,created_at)")
  .not("gift_card_meta", "is", null);

console.log(`\n--- Tüm zamanlar: ${totalCards ?? 0} kart, ${purchaseLines?.length ?? 0} hediye kartı satın alma satırı ---`);
const paidLines = (purchaseLines ?? []).filter((r) => r.orders?.payment_status === "paid");
console.log(`Ödenmiş satın alma satırı: ${paidLines.length}`);
for (const r of paidLines.slice(0, 10)) {
  const { count } = await admin
    .from("gift_cards")
    .select("id", { count: "exact", head: true })
    .eq("purchase_order_item_id", r.id);
  console.log(
    `  ${r.orders?.order_number} | ${r.orders?.created_at?.slice(0, 10)} | issued_for_line=${count ?? 0}`,
  );
}

console.log(`\n--- Tüm teslim edilmemiş kartlar: ${allUndelivered?.length ?? 0} ---`);
for (const c of allUndelivered ?? []) {
  console.log(
    `  ${c.created_at?.slice(0, 10)} | ${c.recipient_email} | attempts=${c.delivery_attempts} | status=${c.status} | order=${c.purchase_order_id ? "var" : "manuel?"}`,
  );
}

if ((allUndelivered ?? []).some((c) => c.delivery_attempts === 0 && c.purchase_order_id)) {
  issues.push("siparişten üretilmiş ama hiç e-posta denemesi yapılmamış kart(lar) var");
}

console.log("\n=== SONUÇ ===");
if (issues.length === 0) {
  console.log("Kritik sorun görülmedi. Yüz değerleri, son kartlar ve sipariş eşlemesi genel olarak tutarlı.");
} else {
  console.log("Dikkat:");
  for (const i of issues) console.log(`- ${i}`);
}
