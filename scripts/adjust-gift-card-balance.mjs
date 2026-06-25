/**
 * Hediye kartı bakiyesini günceller (barter / sepet uyumu).
 *   node scripts/adjust-gift-card-balance.mjs <cardId> <newBalanceTry> [note]
 *
 * Örnek:
 *   node scripts/adjust-gift-card-balance.mjs fdef0c17-e37c-4651-b2d7-56404d997f9d 5140 "Sepet tutarı revize"
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

const [cardId, newBalanceRaw, ...noteParts] = process.argv.slice(2);
const note = noteParts.join(" ").trim() || "Bakiye revize";
const newBalance = Number(newBalanceRaw);

if (!cardId || !Number.isFinite(newBalance) || newBalance <= 0) {
  console.error("Usage: node scripts/adjust-gift-card-balance.mjs <cardId> <newBalanceTry> [note]");
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: card, error: fetchErr } = await admin
  .from("gift_cards")
  .select("id,initial_balance,balance_remaining,status,recipient_email,recipient_name,code_last4,account_visible_code,personal_message")
  .eq("id", cardId)
  .maybeSingle();

if (fetchErr || !card) {
  console.error("Kart bulunamadı:", fetchErr?.message ?? cardId);
  process.exit(1);
}

const oldInitial = Number(card.initial_balance);
const oldRemaining = Number(card.balance_remaining);

if (card.status !== "active") {
  console.error("Kart aktif değil:", card.status);
  process.exit(1);
}

if (oldRemaining !== oldInitial) {
  console.error(
    `Kısmi kullanım var (kalan ${oldRemaining} / başlangıç ${oldInitial}). Revize için manuel kontrol gerekir.`,
  );
  process.exit(1);
}

const delta = Number((newBalance - oldRemaining).toFixed(2));
if (delta === 0) {
  console.log("Bakiye zaten hedef tutarda:", newBalance);
  process.exit(0);
}

const { error: updateErr } = await admin
  .from("gift_cards")
  .update({
    initial_balance: newBalance,
    balance_remaining: newBalance,
    updated_at: new Date().toISOString(),
  })
  .eq("id", cardId);

if (updateErr) {
  console.error("Güncellenemedi:", updateErr.message);
  process.exit(1);
}

const { error: ledgerErr } = await admin.from("gift_card_ledger").insert({
  gift_card_id: cardId,
  amount: Math.abs(delta),
  entry_type: "adjust",
  balance_after: newBalance,
  note: `${note} (${oldRemaining} → ${newBalance} TRY)`,
});

if (ledgerErr) {
  console.error("Defter kaydı başarısız:", ledgerErr.message);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      gift_card_id: cardId,
      recipient: card.recipient_name ?? card.recipient_email,
      old_balance_try: oldRemaining,
      new_balance_try: newBalance,
      delta_try: delta,
      code_last4: card.code_last4,
      account_code: card.account_visible_code ?? null,
      note,
    },
    null,
    2,
  ),
);
