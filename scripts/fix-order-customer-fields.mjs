/**
 * Sipariş müşteri adı / telefon alanlarını düzeltir.
 *   node scripts/fix-order-customer-fields.mjs ZLL0005 --name "Nisa Yigit"
 *   node scripts/fix-order-customer-fields.mjs ZLL0005 --phone 5389631851
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const LOCALE = "tr-TR";

function capitalizeTurkishWord(word) {
  if (!word) return "";
  return word.charAt(0).toLocaleUpperCase(LOCALE) + word.slice(1).toLocaleLowerCase(LOCALE);
}

function normalizeTurkishFullName(raw) {
  const collapsed = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (collapsed === "") return "";
  return collapsed.split(" ").map(capitalizeTurkishWord).join(" ");
}

function normalizeTurkishMobileInput(raw) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length > 2 && digits[2] === "5") {
    digits = `0${digits.slice(2)}`;
  }
  if (digits.length === 10 && digits.startsWith("5")) {
    digits = `0${digits}`;
  }
  return digits.slice(0, 11);
}

function isValidTurkishMobileDigits(digits) {
  return /^05\d{9}$/.test(normalizeTurkishMobileInput(digits));
}

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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const orderNumber = process.argv[2];
const nameIdx = process.argv.indexOf("--name");
const phoneIdx = process.argv.indexOf("--phone");
const nextName = nameIdx >= 0 ? normalizeTurkishFullName(String(process.argv[nameIdx + 1] ?? "")) : null;
const nextPhoneRaw = phoneIdx >= 0 ? normalizeTurkishMobileInput(String(process.argv[phoneIdx + 1] ?? "")) : null;

if (!orderNumber || (!nextName && !nextPhoneRaw)) {
  console.error("Kullanım:");
  console.error('  node scripts/fix-order-customer-fields.mjs ZLL0005 --name "Nisa Yigit"');
  console.error("  node scripts/fix-order-customer-fields.mjs ZLL0005 --phone 5389631851");
  process.exit(1);
}

if (nextPhoneRaw && !isValidTurkishMobileDigits(nextPhoneRaw)) {
  console.error("Geçersiz telefon:", nextPhoneRaw);
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: order, error: fetchErr } = await admin
  .from("orders")
  .select("id,order_number,customer_name,phone")
  .eq("order_number", orderNumber)
  .maybeSingle();

if (fetchErr || !order) {
  console.error("Sipariş bulunamadı:", fetchErr?.message ?? orderNumber);
  process.exit(1);
}

const patch = {};
if (nextName) patch.customer_name = nextName;
if (nextPhoneRaw) patch.phone = nextPhoneRaw;

const { error: updErr } = await admin.from("orders").update(patch).eq("id", order.id);
if (updErr) {
  console.error("Güncelleme hatası:", updErr.message);
  process.exit(1);
}

console.log("Güncellendi:", order.order_number);
if (nextName) console.log("  customer_name:", order.customer_name, "->", nextName);
if (nextPhoneRaw) console.log("  phone:", order.phone, "->", nextPhoneRaw);
