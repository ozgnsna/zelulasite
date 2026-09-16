/**
 * Hediye kartı satın alma akışını uçtan uca test eder (sipariş + ödeme simülasyonu + kart üretimi + e-posta).
 *
 *   CONFIRM=YES_TEST_GIFT_CARD_PURCHASE RECIPIENT_EMAIL=destek@zeluladesign.com node scripts/test-gift-card-purchase.mjs
 *
 * Opsiyonel: AMOUNT=500 (varsayılan 500)
 */

import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const GIFT_CARD_PEPPER_DEFAULT = "zelula-gift-card-v1";

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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function generateGiftCardCode() {
  const hex = (randomUUID() + randomUUID()).replace(/-/g, "");
  let out = "";
  for (let i = 0; i < 16; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return out;
}

function normalizeGiftCardCodeInput(raw) {
  return String(raw ?? "").replace(/[\s-]+/g, "").toUpperCase();
}

function hashGiftCardCode(code) {
  const normalized = normalizeGiftCardCodeInput(code);
  const pepper = process.env.GIFT_CARD_CODE_PEPPER?.trim() || GIFT_CARD_PEPPER_DEFAULT;
  return createHash("sha256").update(`${pepper}:${normalized}`).digest("hex");
}

function giftCardCodeLast4(code) {
  return normalizeGiftCardCodeInput(code).slice(-4);
}

function getDefaultGiftCardExpiresAt(from = new Date()) {
  const raw = Number(process.env.GIFT_CARD_EXPIRY_MONTHS ?? 12);
  const months = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 12;
  const expires = new Date(from);
  expires.setMonth(expires.getMonth() + months);
  return expires;
}

function formatTry(amount) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getFromAddress() {
  return (
    process.env.GIFT_CARD_NOTIFY_FROM_EMAIL?.trim() ||
    process.env.ADMIN_NOTIFY_FROM_EMAIL?.trim() ||
    "Zelula <no-reply@zeluladesign.com>"
  );
}

async function sendGiftCardEmail(payload) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = payload.recipientEmail.trim().toLowerCase();
  if (!apiKey || !to) {
    return { attempted: false, ok: false, error: "resend_or_recipient_missing" };
  }

  const codeDisplay = payload.code.replace(/[\s-]+/g, "").toUpperCase().match(/.{1,4}/g)?.join("-") ?? payload.code;
  const expiryLabel = payload.expiresAt.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "") || "https://zeluladesign.com";
  const text = [
    payload.recipientName?.trim() ? `Merhaba ${payload.recipientName.trim()},` : "Merhaba,",
    "",
    "Size özel dijital hediye kartınız hazır.",
    "",
    `Tutar: ${formatTry(payload.amountTry)}`,
    `Hediye kartı kodu: ${codeDisplay}`,
    `Son kullanma tarihi: ${expiryLabel}`,
    "",
    `${payload.senderName} size bir Zelula hediye kartı gönderdi.`,
    payload.personalMessage ? `“${payload.personalMessage}”` : "",
    "",
    `Alışveriş: ${siteUrl}`,
    "",
    "Sevgilerle, Zelula",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: [to],
      subject: `Zelula hediye kartınız — ${formatTry(payload.amountTry)}`,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { attempted: true, ok: false, error: `gift_card_email_failed:${res.status}:${body}` };
  }
  return { attempted: true, ok: true };
}

async function allocateOrderNumber(admin) {
  const { data, error } = await admin.rpc("next_order_public_number");
  if (!error && data != null) {
    const s = typeof data === "string" ? data : String(data);
    if (/^ZLL\d+$/.test(s.trim())) return s.trim();
  }
  return `ZL-TEST-${Date.now()}`;
}

async function issueGiftCardsForPaidOrder(admin, orderId) {
  const result = { issued: 0, skipped: 0, errors: [], cards: [] };

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,email,user_id,currency,customer_name")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    result.errors.push(orderError?.message ?? "order not found");
    return result;
  }

  const { data: lines, error: linesError } = await admin
    .from("order_items")
    .select("id,quantity,unit_price,gift_card_meta,product:product_id ( id, product_kind, price )")
    .eq("order_id", orderId);

  if (linesError) {
    result.errors.push(linesError.message);
    return result;
  }

  const giftLines = (lines ?? []).filter((line) => {
    const product = Array.isArray(line.product) ? line.product[0] : line.product;
    const meta = line.gift_card_meta;
    return product?.product_kind === "gift_card" || Boolean(meta);
  });

  for (const line of giftLines) {
    const qty = Math.max(1, Math.floor(Number(line.quantity ?? 1)));
    const product = Array.isArray(line.product) ? line.product[0] : line.product;
    const parsedMeta = line.gift_card_meta;
    const recipientEmail =
      String(parsedMeta?.recipientEmail ?? "").trim().toLowerCase() ||
      String(order.email ?? "").trim().toLowerCase();

    if (!recipientEmail) {
      result.errors.push(`order_item ${line.id}: recipient email missing`);
      continue;
    }

    const { count: existingCount } = await admin
      .from("gift_cards")
      .select("id", { count: "exact", head: true })
      .eq("purchase_order_item_id", line.id);

    const alreadyIssued = existingCount ?? 0;
    if (alreadyIssued >= qty) {
      result.skipped += qty;
      continue;
    }

    let denom = null;
    if (parsedMeta?.denominationId) {
      const res = await admin
        .from("gift_card_denominations")
        .select("id, amount, currency")
        .eq("id", parsedMeta.denominationId)
        .maybeSingle();
      denom = res.data;
    } else if (product?.id) {
      const res = await admin
        .from("gift_card_denominations")
        .select("id, amount, currency")
        .eq("product_id", product.id)
        .maybeSingle();
      denom = res.data;
    }

    if (!denom) {
      result.errors.push(`order_item ${line.id}: denomination not found`);
      continue;
    }

    const faceAmount = Number(denom.amount);
    const currency = String(denom.currency ?? order.currency ?? "TRY");
    const expiresAt = getDefaultGiftCardExpiresAt();
    const senderName = String(order.customer_name ?? "").trim() || "Zelula müşterisi";

    const toIssue = qty - alreadyIssued;
    for (let i = 0; i < toIssue; i++) {
      let inserted = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        const code = generateGiftCardCode();
        const row = {
          denomination_id: denom.id,
          code_hash: hashGiftCardCode(code),
          code_last4: giftCardCodeLast4(code),
          initial_balance: faceAmount,
          balance_remaining: faceAmount,
          currency,
          status: "active",
          purchase_order_id: orderId,
          purchase_order_item_id: line.id,
          purchased_by_user_id: order.user_id ?? null,
          purchaser_email: order.email ?? null,
          recipient_email: recipientEmail,
          recipient_name: parsedMeta?.recipientName ?? null,
          personal_message: parsedMeta?.personalMessage ?? null,
          expires_at: expiresAt.toISOString(),
        };
        const { data, error } = await admin.from("gift_cards").insert(row).select("id").single();
        if (!error && data?.id) {
          inserted = { id: data.id, code };
          break;
        }
        const msg = (error?.message ?? "").toLowerCase();
        if (!msg.includes("duplicate") && !msg.includes("unique") && error?.code !== "23505") break;
      }

      if (!inserted) {
        result.errors.push(`order_item ${line.id}: could not insert gift card`);
        continue;
      }

      const { error: ledgerError } = await admin.from("gift_card_ledger").insert({
        gift_card_id: inserted.id,
        order_id: orderId,
        amount: faceAmount,
        entry_type: "issue",
        balance_after: faceAmount,
        note: `Issued on payment for order ${orderId}`,
      });

      if (ledgerError) {
        result.errors.push(`gift_card ${inserted.id}: ledger insert failed — ${ledgerError.message}`);
        continue;
      }

      const delivery = await sendGiftCardEmail({
        recipientEmail,
        recipientName: parsedMeta?.recipientName ?? null,
        code: inserted.code,
        amountTry: faceAmount,
        senderName,
        personalMessage: parsedMeta?.personalMessage ?? null,
        expiresAt,
      });

      if (delivery.ok) {
        await admin
          .from("gift_cards")
          .update({ delivered_at: new Date().toISOString(), delivery_attempts: 1 })
          .eq("id", inserted.id);
      } else {
        await admin.from("gift_cards").update({ delivery_attempts: 1 }).eq("id", inserted.id);
        if (delivery.error) result.errors.push(`gift_card ${inserted.id}: email — ${delivery.error}`);
      }

      result.issued++;
      result.cards.push({
        id: inserted.id,
        code: inserted.code,
        last4: giftCardCodeLast4(inserted.code),
        emailSent: delivery.ok,
      });
    }
  }

  return result;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const CONFIRM = process.env.CONFIRM === "YES_TEST_GIFT_CARD_PURCHASE";
const RECIPIENT_EMAIL = String(process.env.RECIPIENT_EMAIL ?? "destek@zeluladesign.com")
  .trim()
  .toLowerCase();
const AMOUNT = Number(process.env.AMOUNT ?? 500);
const PURCHASER_EMAIL = String(process.env.PURCHASER_EMAIL ?? RECIPIENT_EMAIL).trim().toLowerCase();

if (!CONFIRM) {
  console.error("Onay gerekli: CONFIRM=YES_TEST_GIFT_CARD_PURCHASE");
  console.error(
    `Örnek: CONFIRM=YES_TEST_GIFT_CARD_PURCHASE RECIPIENT_EMAIL=${RECIPIENT_EMAIL} node scripts/test-gift-card-purchase.mjs`,
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

console.log("=== Hediye kartı test satın alması ===");
console.log("Tutar:", AMOUNT, "₺");
console.log("Alıcı:", RECIPIENT_EMAIL);
console.log("Satın alan:", PURCHASER_EMAIL);
console.log("Resend:", process.env.RESEND_API_KEY?.trim() ? "yapılandırılmış" : "YOK");

const { data: denom, error: denomErr } = await admin
  .from("gift_card_denominations")
  .select("id, amount, label, slug, product_id, products:product_id ( id, name, price, product_kind, is_active )")
  .eq("amount", AMOUNT)
  .eq("currency", "TRY")
  .eq("is_active", true)
  .maybeSingle();

if (denomErr || !denom?.product_id) {
  console.error("Aktif yüz değer bulunamadı:", denomErr?.message ?? AMOUNT);
  process.exit(1);
}

const product = Array.isArray(denom.products) ? denom.products[0] : denom.products;
if (!product?.is_active || product.product_kind !== "gift_card") {
  console.error("Ürün satışa hazır değil:", product);
  process.exit(1);
}

const orderNumber = await allocateOrderNumber(admin);
const unitPrice = Number(product.price ?? AMOUNT);
const giftMeta = {
  denominationId: denom.id,
  recipientEmail: RECIPIENT_EMAIL,
  recipientName: "Test Alıcı",
  personalMessage: "Otomatik test satın alması — lütfen dikkate almayın.",
};

const { data: order, error: orderErr } = await admin
  .from("orders")
  .insert({
    order_number: orderNumber,
    customer_name: "Test Hediye Kartı",
    email: PURCHASER_EMAIL,
    phone: "5550000000",
    subtotal: unitPrice,
    discount_amount: 0,
    total: unitPrice,
    currency: "TRY",
    payment_status: "pending",
    order_status: "pending",
    payment_provider: "paytr",
    shipping_address_json: {
      address_line: "Test adresi",
      city: "İstanbul",
      district: "Kadıköy",
      postal_code: "34000",
      delivery_note: "TEST_GIFT_CARD_PURCHASE",
    },
  })
  .select("id, order_number")
  .single();

if (orderErr || !order) {
  console.error("Sipariş oluşturulamadı:", orderErr?.message);
  process.exit(1);
}

const { data: orderItem, error: itemErr } = await admin
  .from("order_items")
  .insert({
    order_id: order.id,
    product_id: product.id,
    quantity: 1,
    unit_price: unitPrice,
    total_price: unitPrice,
    gift_card_meta: giftMeta,
  })
  .select("id")
  .single();

if (itemErr || !orderItem) {
  console.error("Sipariş satırı oluşturulamadı:", itemErr?.message);
  process.exit(1);
}

const callbackHash = `test_gift_card_purchase:${order.id}`;
await admin.from("payment_logs").insert({
  order_id: order.id,
  provider: "paytr",
  event_type: "callback",
  status: "success",
  callback_payload: { test_script: "test-gift-card-purchase.mjs", manual: "1" },
  callback_hash: callbackHash,
  reference: `test_paytr_${order.id}`,
  verification_status: "passed",
  processed_at: new Date().toISOString(),
});

await admin
  .from("orders")
  .update({
    payment_status: "paid",
    order_status: "confirmed",
    payment_reference: `test_paytr_${order.order_number}`,
    updated_at: new Date().toISOString(),
  })
  .eq("id", order.id);

const issue = await issueGiftCardsForPaidOrder(admin, order.id);

console.log("\n--- Sonuç ---");
console.log("Sipariş:", order.order_number, order.id);
console.log("Üretilen kart:", issue.issued, "| Atlanan:", issue.skipped);
if (issue.errors.length) console.log("Hatalar:", issue.errors);

for (const card of issue.cards) {
  const { data: row } = await admin
    .from("gift_cards")
    .select("id,code_last4,balance_remaining,delivered_at,delivery_attempts,purchase_order_id")
    .eq("id", card.id)
    .maybeSingle();

  const hashOk = row
    ? (await admin.from("gift_cards").select("id").eq("code_hash", hashGiftCardCode(card.code)).maybeSingle()).data?.id ===
      card.id
    : false;

  console.log(
    JSON.stringify(
      {
        gift_card_id: card.id,
        code: card.code,
        last4: card.last4,
        hash_lookup_ok: hashOk,
        email_sent: card.emailSent,
        delivered_at: row?.delivered_at ?? null,
        balance: row?.balance_remaining,
        purchase_order_id: row?.purchase_order_id,
      },
      null,
      2,
    ),
  );
}

if (issue.issued === 0 || issue.errors.length > 0) {
  console.error("\nTEST BAŞARISIZ");
  process.exit(1);
}

console.log("\nTEST BAŞARILI — kod e-postaya gönderildi (veya Resend yapılandırması eksikse konsolda).");
