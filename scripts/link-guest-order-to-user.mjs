/**
 * Misafir siparişi müşteri hesabına bağlar; isteğe bağlı yeni hesap açar ve sipariş e-postasını günceller.
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Örnek:
 *   ORDER_NUMBER=ZLL0002 CUSTOMER_EMAIL=fatmagulbuyukbekar@gmail.com CREATE_IF_MISSING=YES UPDATE_ORDER_EMAIL=YES CONFIRM=YES_LINK_GUEST_ORDER node scripts/link-guest-order-to-user.mjs
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ZELULA_PUAN_PER_100_TRY = 5;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
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

function earnPointsFromTotal(totalTry) {
  const t = Number(totalTry);
  if (!Number.isFinite(t) || t <= 0) return 0;
  return Math.floor(t / 100) * ZELULA_PUAN_PER_100_TRY;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(projectRoot, ".env"));

const ORDER_NUMBER = String(process.env.ORDER_NUMBER ?? "").trim();
const CUSTOMER_EMAIL = normalizeEmail(process.env.CUSTOMER_EMAIL);
const CREATE_IF_MISSING = process.env.CREATE_IF_MISSING === "YES";
const UPDATE_ORDER_EMAIL = process.env.UPDATE_ORDER_EMAIL === "YES";
const CONFIRM = process.env.CONFIRM ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (CONFIRM !== "YES_LINK_GUEST_ORDER") {
  console.error(
    "Güvenlik: ORDER_NUMBER, CUSTOMER_EMAIL ve CONFIRM=YES_LINK_GUEST_ORDER ile çağırın.",
  );
  process.exit(1);
}

if (!ORDER_NUMBER || !CUSTOMER_EMAIL) {
  console.error("ORDER_NUMBER ve CUSTOMER_EMAIL gerekli.");
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local).");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const user = data.users.find((u) => normalizeEmail(u.email) === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
    page += 1;
  }
}

async function syncEarnPoints(order) {
  if (order.payment_status !== "paid" || String(order.order_status ?? "") === "cancelled") return;
  if (!order.user_id) return;

  const earnDesc = `EARN_ORDER:${order.id}`;
  const { data: existing } = await admin
    .from("loyalty_points_ledger")
    .select("id")
    .eq("order_id", order.id)
    .eq("type", "earned")
    .eq("description", earnDesc)
    .maybeSingle();

  if (existing) return;

  const points = earnPointsFromTotal(order.total);
  if (points <= 0) return;

  const { error } = await admin.from("loyalty_points_ledger").insert({
    user_id: order.user_id,
    order_id: order.id,
    points,
    type: "earned",
    description: earnDesc,
  });
  if (error) throw new Error(error.message);
  console.log(`Loyalty: +${points} puan işlendi.`);
}

const { data: order, error: orderErr } = await admin
  .from("orders")
  .select("id,order_number,customer_name,email,phone,user_id,payment_status,order_status,total")
  .eq("order_number", ORDER_NUMBER)
  .maybeSingle();

if (orderErr) {
  console.error("Sipariş sorgusu hatası:", orderErr.message);
  process.exit(1);
}

if (!order) {
  console.error(`Sipariş bulunamadı: ${ORDER_NUMBER}`);
  process.exit(1);
}

if (order.user_id) {
  console.error(`Sipariş zaten bir hesaba bağlı (user_id=${order.user_id}).`);
  process.exit(1);
}

let user = await findUserByEmail(CUSTOMER_EMAIL);
if (!user && !CREATE_IF_MISSING) {
  console.error(`Kayıtlı kullanıcı bulunamadı: ${CUSTOMER_EMAIL}`);
  process.exit(1);
}

const fullName = normalizeFullName(order.customer_name);
const phone = normalizePhone(order.phone);

if (!user && CREATE_IF_MISSING) {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: CUSTOMER_EMAIL,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      ...(phone ? { phone } : {}),
    },
  });
  if (createErr) {
    console.error("Hesap oluşturma hatası:", createErr.message);
    process.exit(1);
  }
  user = created.user;
  console.log("Yeni hesap oluşturuldu:", user.id, CUSTOMER_EMAIL);
}

if (!user) {
  console.error("Kullanıcı bulunamadı.");
  process.exit(1);
}

const profilePayload = {
  id: user.id,
  full_name: fullName || "Müşteri",
  ...(phone ? { phone } : {}),
  updated_at: new Date().toISOString(),
};

const { error: profileErr } = await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });
if (profileErr) {
  console.error("Profil güncelleme hatası:", profileErr.message);
  process.exit(1);
}

const orderUpdate = {
  user_id: user.id,
  ...(UPDATE_ORDER_EMAIL ? { email: CUSTOMER_EMAIL } : {}),
};

console.log("Sipariş (önce):", {
  order_number: order.order_number,
  customer_name: order.customer_name,
  order_email: order.email,
  payment_status: order.payment_status,
  order_status: order.order_status,
});
console.log("Hesap:", {
  id: user.id,
  email: user.email,
  full_name: fullName,
  phone,
});

const { data: updatedOrder, error: updateErr } = await admin
  .from("orders")
  .update(orderUpdate)
  .eq("id", order.id)
  .is("user_id", null)
  .select("id,order_number,email,user_id,payment_status,order_status,total")
  .maybeSingle();

if (updateErr) {
  console.error("Sipariş güncelleme hatası:", updateErr.message);
  process.exit(1);
}

if (!updatedOrder) {
  console.error("Sipariş güncellenemedi (başka bir işlem bağlamış olabilir).");
  process.exit(1);
}

await syncEarnPoints(updatedOrder);

console.log(`Tamam: ${ORDER_NUMBER} → ${CUSTOMER_EMAIL} (${user.id})`);
