/**
 * Hediye kartı tanı / pepper uyumu kontrolü
 *   node scripts/diagnose-gift-card.mjs XDRM1I9OC3GEZ306
 *   node scripts/diagnose-gift-card.mjs --email=buketoner336@gmail.com
 */

import { createHash } from "node:crypto";
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

function normalizeGiftCardCodeInput(raw) {
  return String(raw ?? "").replace(/[\s-]+/g, "").toUpperCase();
}

function hashWithPepper(code, pepper) {
  const normalized = normalizeGiftCardCodeInput(code);
  return createHash("sha256").update(`${pepper}:${normalized}`).digest("hex");
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(projectRoot, ".env"));

const arg = process.argv[2] ?? "";
const emailArg = process.argv.find((a) => a.startsWith("--email="))?.slice("--email=".length)?.trim().toLowerCase();
const code = arg.startsWith("--") ? "" : normalizeGiftCardCodeInput(arg);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pepper = process.env.GIFT_CARD_CODE_PEPPER?.trim() || SERVICE_ROLE?.trim() || "zelula-gift-card-dev-pepper";

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

console.log("Supabase:", SUPABASE_URL);
console.log("Pepper kaynağı:", process.env.GIFT_CARD_CODE_PEPPER?.trim() ? "GIFT_CARD_CODE_PEPPER" : SERVICE_ROLE ? "SUPABASE_SERVICE_ROLE_KEY" : "dev fallback");

if (emailArg) {
  const { data: cards, error } = await admin
    .from("gift_cards")
    .select("id,code_last4,status,balance_remaining,recipient_email,recipient_name,expires_at,created_at,personal_message")
    .ilike("recipient_email", emailArg)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(`\n${emailArg} için ${cards?.length ?? 0} kart:`);
  console.log(JSON.stringify(cards, null, 2));
}

if (code) {
  const last4 = code.slice(-4);
  const hash = hashWithPepper(code, pepper);
  console.log("\nKod:", code, "last4:", last4);
  console.log("Hash (mevcut pepper):", hash);

  const { data: byHash } = await admin
    .from("gift_cards")
    .select("id,code_last4,status,balance_remaining,recipient_email,recipient_name,expires_at,created_at")
    .eq("code_hash", hash)
    .maybeSingle();

  console.log("\nHash ile eşleşme:", byHash ?? "YOK");

  const { data: byLast4 } = await admin
    .from("gift_cards")
    .select("id,code_hash,code_last4,status,balance_remaining,recipient_email,recipient_name,expires_at,created_at")
    .eq("code_last4", last4)
    .order("created_at", { ascending: false });

  console.log(`\nlast4=${last4} ile ${byLast4?.length ?? 0} kart:`);
  for (const c of byLast4 ?? []) {
    const match = c.code_hash === hash ? "MATCH" : "hash farklı (pepper uyumsuzluğu?)";
    console.log({ ...c, code_hash: c.code_hash?.slice(0, 16) + "…", match });
  }
}

if (!code && !emailArg) {
  console.error("Kullanım: node scripts/diagnose-gift-card.mjs KOD veya --email=...");
  process.exit(1);
}
