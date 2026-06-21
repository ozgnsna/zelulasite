/**
 * Manuel hediye kartı / kupon (sabit TRY bakiye) oluşturur.
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GIFT_CARD_CODE_PEPPER (önerilir)
 *
 * Örnek:
 *   RECIPIENT_EMAIL=buket@example.com AMOUNT=2000 RECIPIENT_NAME="Buket Hanım" NOTE="Reklam iş birliği" CONFIRM=YES_ISSUE_GIFT_CARD node scripts/issue-manual-gift-card.mjs
 *
 * E-posta bilinmiyorsa profil araması:
 *   SEARCH_NAME=buket AMOUNT=2000 CONFIRM=YES_ISSUE_GIFT_CARD node scripts/issue-manual-gift-card.mjs
 */

import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

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
  const pepper =
    process.env.GIFT_CARD_CODE_PEPPER?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "zelula-gift-card-dev-pepper";
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

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(projectRoot, ".env"));

const RECIPIENT_EMAIL = String(process.env.RECIPIENT_EMAIL ?? "").trim().toLowerCase();
const SEARCH_NAME = String(process.env.SEARCH_NAME ?? "").trim();
const RECIPIENT_NAME = String(process.env.RECIPIENT_NAME ?? "").trim();
const NOTE = String(process.env.NOTE ?? "Manuel hediye kartı").trim();
const AMOUNT = Number(process.env.AMOUNT ?? "2000");
const CONFIRM = process.env.CONFIRM ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (CONFIRM !== "YES_ISSUE_GIFT_CARD") {
  console.error("Güvenlik: CONFIRM=YES_ISSUE_GIFT_CARD ile çağırın.");
  process.exit(1);
}

if (!Number.isFinite(AMOUNT) || AMOUNT <= 0) {
  console.error("AMOUNT geçerli bir pozitif sayı olmalı.");
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function findUserEmailByName(needle) {
  let page = 1;
  const matches = [];
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) {
      const email = String(user.email ?? "").trim().toLowerCase();
      if (!email) continue;
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      const fullName = String(profile?.full_name ?? user.user_metadata?.full_name ?? "").trim();
      if (fullName.toLowerCase().includes(needle.toLowerCase())) {
        matches.push({ id: user.id, email, full_name: fullName });
      }
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  return matches;
}

let recipientEmail = RECIPIENT_EMAIL;
let recipientName = RECIPIENT_NAME;

if (!recipientEmail && SEARCH_NAME) {
  const matches = await findUserEmailByName(SEARCH_NAME);
  if (matches.length === 0) {
    console.error(`"${SEARCH_NAME}" ile eşleşen hesap bulunamadı. RECIPIENT_EMAIL verin.`);
    process.exit(1);
  }
  if (matches.length > 1) {
    console.error("Birden fazla eşleşme; RECIPIENT_EMAIL ile netleştirin:");
    console.error(JSON.stringify(matches, null, 2));
    process.exit(1);
  }
  recipientEmail = matches[0].email;
  if (!recipientName) recipientName = matches[0].full_name;
  console.log("Hesap bulundu:", matches[0]);
}

if (!recipientEmail) {
  console.error("RECIPIENT_EMAIL veya SEARCH_NAME gerekli.");
  process.exit(1);
}

const slug = `manual-${Math.round(AMOUNT)}-try`;
const label = `${AMOUNT.toLocaleString("tr-TR")} ₺ Zelula Kuponu`;

let { data: denom } = await admin
  .from("gift_card_denominations")
  .select("id,amount,currency,label,slug")
  .eq("amount", AMOUNT)
  .eq("currency", "TRY")
  .maybeSingle();

if (!denom) {
  const { data: inserted, error: denomErr } = await admin
    .from("gift_card_denominations")
    .insert({
      amount: AMOUNT,
      currency: "TRY",
      label,
      slug,
      is_active: false,
      sort_order: 999,
    })
    .select("id,amount,currency,label,slug")
    .single();
  if (denomErr) {
    console.error("Yüz değer oluşturulamadı:", denomErr.message);
    process.exit(1);
  }
  denom = inserted;
  console.log("Yeni yüz değer oluşturuldu:", denom);
}

const expiresAt = getDefaultGiftCardExpiresAt();
const code = generateGiftCardCode();

const { data: card, error: cardErr } = await admin
  .from("gift_cards")
  .insert({
    denomination_id: denom.id,
    code_hash: hashGiftCardCode(code),
    code_last4: giftCardCodeLast4(code),
    initial_balance: AMOUNT,
    balance_remaining: AMOUNT,
    currency: "TRY",
    status: "active",
    recipient_email: recipientEmail,
    recipient_name: recipientName || null,
    personal_message: NOTE,
    expires_at: expiresAt.toISOString(),
  })
  .select("id")
  .single();

if (cardErr || !card) {
  console.error("Hediye kartı oluşturulamadı:", cardErr?.message ?? "unknown");
  process.exit(1);
}

const { error: ledgerErr } = await admin.from("gift_card_ledger").insert({
  gift_card_id: card.id,
  amount: AMOUNT,
  entry_type: "issue",
  balance_after: AMOUNT,
  note: NOTE,
});

if (ledgerErr) {
  console.error("Defter kaydı başarısız:", ledgerErr.message);
  process.exit(1);
}

console.log("\nTamam — hediye kartı / kupon oluşturuldu:");
console.log(
  JSON.stringify(
    {
      gift_card_id: card.id,
      recipient_email: recipientEmail,
      recipient_name: recipientName || null,
      amount_try: AMOUNT,
      code,
      expires_at: expiresAt.toISOString(),
      note: NOTE,
      usage: "Sepette ödeme adımında hediye kartı kodu olarak girilir.",
    },
    null,
    2,
  ),
);
