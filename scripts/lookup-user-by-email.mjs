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

const needle = (process.argv[2] ?? "nisanrozerr@gmail.com").trim().toLowerCase();

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const matches = [];
let page = 1;
while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  for (const u of data.users) {
    const email = String(u.email ?? "").trim().toLowerCase();
    if (email === needle || email.includes(needle.replace("@gmail.com", ""))) {
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name,phone")
        .eq("id", u.id)
        .maybeSingle();
      matches.push({
        id: u.id,
        email: u.email,
        full_name: profile?.full_name ?? u.user_metadata?.full_name ?? null,
        phone: profile?.phone ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      });
    }
  }
  if (data.users.length < 1000) break;
  page += 1;
}

const exact = matches.filter((m) => String(m.email ?? "").toLowerCase() === needle);

if (exact.length > 0) {
  console.log("HESAP VAR (tam eşleşme):");
  console.log(JSON.stringify(exact, null, 2));
} else if (matches.length > 0) {
  console.log("Tam eşleşme yok; benzer:");
  console.log(JSON.stringify(matches, null, 2));
} else {
  console.log("Hesap bulunamadı:", needle);
}

const { data: orders } = await admin
  .from("orders")
  .select("id,order_number,payment_status,created_at")
  .ilike("email", needle)
  .order("created_at", { ascending: false })
  .limit(5);

if (orders?.length) {
  console.log("\nSIPARISLER (e-posta ile):");
  console.log(JSON.stringify(orders, null, 2));
}

const { data: cards } = await admin
  .from("gift_cards")
  .select("id,balance_remaining,status,recipient_name,created_at")
  .ilike("recipient_email", needle);

if (cards?.length) {
  console.log("\nHEDIYE KARTLARI:");
  console.log(JSON.stringify(cards, null, 2));
}
