/**
 * Admin: müşteri hesabı oluşturur (doğrulama maili göndermez).
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Örnek:
 *   EMAIL=nisanrozerr@gmail.com FULL_NAME="Nisa Nur Akhan" PHONE="05325420649" \
 *   ADDRESS_LINE="Gayret Mah. Oruç Reis Sok. Park Çiftlik Konutları CK5 Blok Daire: 30" \
 *   CITY=Ankara DISTRICT=Yenimahalle POSTAL_CODE=06170 \
 *   TEMP_PASSWORD="Zelula-Temp-7kM2pQ9x" CONFIRM=YES_CREATE_CUSTOMER_ACCOUNT \
 *   node scripts/create-customer-account.mjs
 */
import { randomBytes } from "node:crypto";
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function normalizePhone(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("90") && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith("5") && digits.length === 10) return `0${digits}`;
  if (/^05\d{9}$/.test(digits)) return digits;
  return digits;
}

function normalizeFullName(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function generateTempPassword() {
  const core = randomBytes(6).toString("base64url");
  return `Zelula-${core}`;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(root, ".env.local"));

const CONFIRM = process.env.CONFIRM ?? "";
const EMAIL = normalizeEmail(process.env.EMAIL ?? process.argv[2] ?? "");
const FULL_NAME = normalizeFullName(process.env.FULL_NAME ?? process.argv[3] ?? "");
const PHONE = normalizePhone(process.env.PHONE ?? process.argv[4] ?? "");
const ADDRESS_LINE = String(process.env.ADDRESS_LINE ?? "").trim();
const CITY = String(process.env.CITY ?? "Ankara").trim();
const DISTRICT = String(process.env.DISTRICT ?? "Yenimahalle").trim();
const POSTAL_CODE = String(process.env.POSTAL_CODE ?? "06170").trim();
const TEMP_PASSWORD = String(process.env.TEMP_PASSWORD ?? generateTempPassword());

if (CONFIRM !== "YES_CREATE_CUSTOMER_ACCOUNT") {
  console.error("Güvenlik: CONFIRM=YES_CREATE_CUSTOMER_ACCOUNT ile çağırın.");
  process.exit(1);
}

if (!EMAIL || !FULL_NAME || !PHONE || !ADDRESS_LINE) {
  console.error("EMAIL, FULL_NAME, PHONE ve ADDRESS_LINE gerekli.");
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase env eksik (.env.local).");
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((u) => normalizeEmail(u.email) === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
    page += 1;
  }
}

const existing = await findUserByEmail(EMAIL);
if (existing) {
  console.error("Bu e-posta ile hesap zaten var:", existing.id);
  process.exit(1);
}

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: TEMP_PASSWORD,
  email_confirm: true,
  user_metadata: {
    full_name: FULL_NAME,
    phone: PHONE,
  },
});

if (createErr || !created.user) {
  console.error("Hesap oluşturulamadı:", createErr?.message ?? "unknown");
  process.exit(1);
}

const userId = created.user.id;

const { error: profileErr } = await admin.from("profiles").upsert(
  {
    id: userId,
    full_name: FULL_NAME,
    phone: PHONE,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "id" },
);

if (profileErr) {
  console.error("Profil hatası:", profileErr.message);
  process.exit(1);
}

const { error: addressErr } = await admin.from("customer_saved_addresses").insert({
  user_id: userId,
  label: "Ev",
  recipient_name: FULL_NAME,
  phone: PHONE,
  address_line: ADDRESS_LINE,
  city: CITY,
  district: DISTRICT,
  postal_code: POSTAL_CODE,
  is_default: true,
});

if (addressErr) {
  console.error("Adres hatası:", addressErr.message);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      user_id: userId,
      email: EMAIL,
      full_name: FULL_NAME,
      phone: PHONE,
      saved_address: { address_line: ADDRESS_LINE, city: CITY, district: DISTRICT, postal_code: POSTAL_CODE },
      temp_password: TEMP_PASSWORD,
      email_sent: false,
      note: "Müşteri /sifremi-unuttum ile kendi şifresini belirleyebilir. Geçici şifreyi yalnızca admin iletin.",
    },
    null,
    2,
  ),
);
