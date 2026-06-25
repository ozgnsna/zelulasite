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
const { data: order } = await admin
  .from("orders")
  .select("id,order_number,email,customer_name,payment_status,created_at")
  .eq("order_number", orderNumber)
  .maybeSingle();

if (!order) {
  console.error("Order not found");
  process.exit(1);
}

const { data: logs } = await admin
  .from("payment_logs")
  .select("id,provider,event_type,status,verification_status,verification_error,response_payload,reference,processed_at,created_at")
  .eq("order_id", order.id)
  .order("created_at", { ascending: true });

console.log(JSON.stringify({ order, logs }, null, 2));
