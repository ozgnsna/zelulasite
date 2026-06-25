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

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(projectRoot, ".env.local"));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const orderNumber = process.argv[2] ?? "ZLL0002";
const needle = String(process.argv[3] ?? "fatmagul").toLowerCase();

const { data: order } = await admin
  .from("orders")
  .select("id,order_number,customer_name,email,phone,user_id,payment_status,order_status,total,created_at")
  .eq("order_number", orderNumber)
  .maybeSingle();

console.log("ORDER", JSON.stringify(order, null, 2));

const matches = [];
let page = 1;
while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  for (const u of data.users) {
    const e = String(u.email ?? "").toLowerCase();
    if (e.includes(needle)) {
      matches.push({ id: u.id, email: u.email, created_at: u.created_at });
    }
  }
  if (data.users.length < 1000) break;
  page += 1;
}

console.log("MATCHING_USERS", JSON.stringify(matches, null, 2));
