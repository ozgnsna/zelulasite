/**
 * Oluşturulmuş karta hesap alanlarını yazar (migration sonrası).
 *   node scripts/patch-gift-card-account-fields.mjs fdef0c17-e37c-4651-b2d7-56404d997f9d 5RZ6XJFXZ7N4XYET fce2664f-42b9-4e17-898c-d5328e9cb516
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

const [cardId, code, userId] = process.argv.slice(2);
if (!cardId || !code) {
  console.error("Usage: node scripts/patch-gift-card-account-fields.mjs <cardId> <code> [userId]");
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const payload = {
  account_visible_code: code,
  ...(userId ? { recipient_user_id: userId } : {}),
};

const { error } = await admin.from("gift_cards").update(payload).eq("id", cardId);
if (error) {
  console.error("Güncellenemedi:", error.message);
  console.error("Supabase SQL Editor'de migration dosyasını çalıştırın: supabase/migrations/20260610120000_gift_cards_recipient_account.sql");
  process.exit(1);
}

console.log("Kart hesap alanları güncellendi:", cardId);
