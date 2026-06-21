/**
 * Hediye kartı hash'ini sabit pepper'a günceller (prod/local uyumu).
 *   node scripts/fix-gift-card-hash.mjs XDRM1I9OC3GEZ306
 *   node scripts/fix-gift-card-hash.mjs --id=7ef0e044-a4f6-4773-aa70-00006613629f
 */

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Uygulama ile aynı sabit pepper (src/lib/gift-cards/code.ts) */
export const GIFT_CARD_PEPPER_DEFAULT = "zelula-gift-card-v1";

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

function normalize(code) {
  return String(code ?? "").replace(/[\s-]+/g, "").toUpperCase();
}

function hash(code, pepper) {
  return createHash("sha256").update(`${pepper}:${normalize(code)}`).digest("hex");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(root, ".env.local"));

const codeArg = process.argv[2]?.startsWith("--") ? "" : process.argv[2];
const idArg = process.argv.find((a) => a.startsWith("--id="))?.slice("--id=".length);
const pepper =
  process.env.GIFT_CARD_CODE_PEPPER?.trim() || GIFT_CARD_PEPPER_DEFAULT;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

let card = null;
if (idArg) {
  const { data } = await admin.from("gift_cards").select("id,code_last4,recipient_email").eq("id", idArg).maybeSingle();
  card = data;
} else if (codeArg) {
  const last4 = normalize(codeArg).slice(-4);
  const { data } = await admin
    .from("gift_cards")
    .select("id,code_last4,recipient_email")
    .eq("code_last4", last4)
    .eq("status", "active")
    .maybeSingle();
  card = data;
  if (card) {
    const newHash = hash(codeArg, pepper);
    const { error } = await admin.from("gift_cards").update({ code_hash: newHash }).eq("id", card.id);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    console.log("Güncellendi:", { id: card.id, email: card.recipient_email, pepper, code: normalize(codeArg) });
    process.exit(0);
  }
}

if (!card) {
  console.error("Kart bulunamadı. Kod veya --id= verin.");
  process.exit(1);
}
