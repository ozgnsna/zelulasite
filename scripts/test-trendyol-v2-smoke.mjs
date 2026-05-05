import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const root = process.cwd();
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error("Supabase env eksik: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const { data: integration, error } = await admin
  .from("marketplace_integrations")
  .select("environment,seller_id,supplier_id,api_key,api_secret,is_active")
  .eq("marketplace", "trendyol")
  .maybeSingle();

if (error) throw error;
if (!integration?.is_active) throw new Error("Trendyol integration aktif değil.");
if (!integration.seller_id || !integration.api_key || !integration.api_secret) {
  throw new Error("Trendyol integration seller/api bilgileri eksik.");
}

const baseUrl =
  integration.environment === "prod" ? "https://apigw.trendyol.com" : "https://stageapigw.trendyol.com";
const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
const endpoint = `${baseUrl}/integration/product/sellers/${encodeURIComponent(integration.seller_id)}/products/approved?size=20&page=0`;

const res = await fetch(endpoint, {
  headers: {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
    "User-Agent": `${integration.seller_id} - Zelula`,
  },
});
const text = await res.text();
let body;
try {
  body = text ? JSON.parse(text) : null;
} catch {
  body = { raw: text };
}

if (!res.ok) {
  console.error(`FAIL status=${res.status}`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

const content = Array.isArray(body?.content) ? body.content : [];
console.log(`OK status=${res.status}`);
console.log(`products_on_page=${content.length}`);
console.log(`total_elements=${body?.totalElements ?? "n/a"}`);
console.log(`next_page_token=${body?.nextPageToken ? "present" : "none"}`);
if (content[0]) {
  console.log(`item0_keys=${Object.keys(content[0]).join(",")}`);
  console.log(
    `item0_preview=${JSON.stringify(
      {
        contentId: content[0]?.contentId,
        barcode: content[0]?.barcode,
        productMainId: content[0]?.productMainId,
        stockCode: content[0]?.stockCode,
        title: content[0]?.title,
        name: content[0]?.name,
        variant0: Array.isArray(content[0]?.variants) ? content[0]?.variants?.[0] : null,
      },
      null,
      0,
    )}`,
  );
}
