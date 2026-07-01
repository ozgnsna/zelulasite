import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = t.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: i } = await admin.from("marketplace_integrations").select("*").eq("marketplace", "trendyol").single();
const base = "https://apigw.trendyol.com";
const auth = Buffer.from(`${i.api_key}:${i.api_secret}`).toString("base64");
const headers = { Authorization: `Basic ${auth}`, Accept: "application/json", "User-Agent": `${i.seller_id} - Zelula` };
const start = Date.now() - 3 * 24 * 3600 * 1000;
const end = Date.now();

async function probe(label, url) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  console.log(`${label}: HTTP ${res.status} — ${text.slice(0, 200).replace(/\s+/g, " ")}`);
}

await probe(
  "YENİ sipariş path",
  `${base}/integration/order/sellers/${i.seller_id}/orders?page=0&size=1&startDate=${start}&endDate=${end}`,
);
await probe(
  "ESKİ sipariş path",
  `${base}/suppliers/${i.supplier_id}/orders?page=0&size=1&startDate=${start}&endDate=${end}`,
);
