/**
 * Admin sipariş bildirimi (e-posta + WhatsApp) yapılandırmasını kontrol eder.
 * Sipariş oluşturmadan çalıştırın:
 *   node scripts/diagnose-admin-notify.mjs
 *
 * Vercel env için: vercel env pull .env.local && node scripts/diagnose-admin-notify.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

function flag(name) {
  const v = process.env[name]?.trim();
  return { set: Boolean(v), hint: v ? "(ayarlı)" : "(eksik)" };
}

function splitCsv(value) {
  return (value ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeWhatsAppRecipients() {
  return splitCsv(process.env.ADMIN_NOTIFY_WHATSAPP_TO)
    .map((v) => v.replace(/[^\d+]/g, "").trim())
    .map((v) => (v.startsWith("+") ? v.slice(1) : v))
    .map((v) => (v.startsWith("00") ? v.slice(2) : v))
    .filter((v) => /^\d{8,15}$/.test(v));
}

function emailRecipients() {
  const preferred = splitCsv(process.env.ADMIN_NOTIFY_EMAILS);
  if (preferred.length > 0) return preferred;
  return splitCsv(process.env.ADMIN_EMAILS);
}

console.log("\n=== Zelula admin sipariş bildirimi teşhisi ===\n");

const resend = flag("RESEND_API_KEY");
const emails = emailRecipients();
const waToken = flag("WHATSAPP_CLOUD_ACCESS_TOKEN");
const waPhoneId = flag("WHATSAPP_CLOUD_PHONE_NUMBER_ID");
const waTo = normalizeWhatsAppRecipients();
const waTemplate = process.env.WHATSAPP_CLOUD_TEMPLATE_NAME?.trim() || null;

console.log("E-posta (Resend)");
console.log(`  RESEND_API_KEY:        ${resend.set ? "✓ ayarlı" : "✗ eksik"}`);
console.log(`  ADMIN_NOTIFY_EMAILS:   ${emails.length ? `✓ ${emails.length} alıcı` : "✗ boş (ADMIN_EMAILS de boşsa mail gitmez)"}`);
console.log(`  ADMIN_NOTIFY_FROM:     ${flag("ADMIN_NOTIFY_FROM_EMAIL").set ? "✓" : "○ varsayılan no-reply@zeluladesign.com"}`);

console.log("\nWhatsApp (Meta Cloud API)");
console.log(`  ACCESS_TOKEN:          ${waToken.set ? "✓ ayarlı" : "✗ eksik"}`);
console.log(`  PHONE_NUMBER_ID:       ${waPhoneId.set ? "✓ ayarlı" : "✗ eksik"}`);
console.log(`  ADMIN_NOTIFY_WHATSAPP_TO: ${waTo.length ? `✓ ${waTo.length} numara` : "✗ geçerli numara yok"}`);
if (waTemplate) {
  console.log(`  WHATSAPP_CLOUD_TEMPLATE_NAME: ✓ "${waTemplate}" (sadece şablon gönderilir; sipariş metni şablonda yoksa anlamsız olabilir)`);
} else {
  console.log("  WHATSAPP_CLOUD_TEMPLATE_NAME: ○ yok → düz metin denenir");
  console.log("    ⚠ Meta: İşletme hattından serbest metin için alıcının son 24 saatte size yazmış olması gerekir.");
  console.log("    Kalıcı çözüm: onaylı utility şablonu veya admin numarasından işletme hattına bir kez mesaj.");
}

const emailReady = resend.set && emails.length > 0;
const waReady = waToken.set && waPhoneId.set && waTo.length > 0;

console.log("\nÖzet");
if (!emailReady && !waReady) {
  console.log("  ✗ Hiçbir kanal gönderime hazır değil (Vercel Production env kontrol edin).");
} else {
  if (emailReady) console.log("  ✓ E-posta gönderilebilir");
  else console.log("  ✗ E-posta: eksik env");
  if (waReady) console.log("  ✓ WhatsApp denenebilir (Meta / şablon kurallarına bağlı)");
  else console.log("  ✗ WhatsApp: eksik env");
}

console.log("\nSipariş tetikleyicileri");
console.log("  • Havale/EFT: checkout sonrası hemen bildirim");
console.log("  • Kart (QNB): yalnızca banka callback başarılı olunca (applyPaymentResult)");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (url && key) {
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from("payment_logs")
    .select("order_id,status,verification_status,verification_error,response_payload,created_at")
    .eq("provider", "internal_notify")
    .eq("event_type", "admin_notify")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("\nSon 5 admin_notify kaydı (Supabase)");
  if (error) {
    console.log(`  ✗ Sorgu hatası: ${error.message}`);
  } else if (!data?.length) {
    console.log("  (kayıt yok — henüz bildirim tetiklenmemiş veya log yok)");
  } else {
    for (const row of data) {
      const payload = row.response_payload ?? {};
      const email = payload.email ?? {};
      const wa = payload.whatsapp ?? {};
      console.log(`  - ${row.created_at} | status=${row.status} | verify=${row.verification_status}`);
      console.log(`    email: attempted=${email.attempted} ok=${email.ok} ${email.error ?? email.skippedReason ?? ""}`);
      console.log(`    whatsapp: attempted=${wa.attempted} ok=${wa.ok} ${wa.error ?? wa.skippedReason ?? ""}`);
      if (row.verification_error) console.log(`    log error: ${row.verification_error}`);
    }
  }
} else {
  console.log("\nSupabase logları atlandı (NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY yok).");
}

console.log("\nAdmin panel: Sipariş detay → Ödeme bildirimleri → Kayıt geçmişi (internal_notify).\n");

if (process.argv.includes("--checklist")) {
  console.log(`=== Meta WhatsApp Business kurulum checklist (Trendyol tarzı otomatik mesaj) ===

1) business.facebook.com → İşletme portföyü oluştur (Zelula Design)
2) developers.facebook.com → Uygulama → WhatsApp ürününü ekle
3) WhatsApp → API Setup:
   - Phone Number ID → Vercel: WHATSAPP_CLOUD_PHONE_NUMBER_ID
   - Kalıcı token (System User) → Vercel: WHATSAPP_CLOUD_ACCESS_TOKEN
4) WhatsApp → Phone numbers → işletme hattı al (yeni numara önerilir; kişisel WA ile aynı olmaz)
5) WhatsApp Manager → Message templates → Türkçe şablonları oluştur ve onaylat:
   Admin: zelula_admin_new_order
     Gövde: Yeni sipariş {{1}} — Müşteri: {{2}} — Toplam: {{3}}
   Müşteri kargoda: zelula_order_shipped
     Gövde: Gönderinle ilgili bir haberimiz var 📦 {{1}} numaralı gönderin kargoya verildi...
     Düğme URL: https://www.zeluladesign.com/siparis/{{1}}/basarili
   (Benzer: zelula_order_paid, zelula_order_delivered)
6) Vercel Production env — hepsini ekle, redeploy
7) Test: node scripts/diagnose-admin-notify.mjs

NOT: Sitedeki wa.me linki (footer destek) ≠ Cloud API. Trendyol mesajları API + onaylı şablondur.
Mavi tik (verified business) ayrı başvuru; şablonlar onaylanmadan müşteriye otomatik mesaj gitmez.
`);
}
