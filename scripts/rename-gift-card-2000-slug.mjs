/**
 * manual-2000-try → hediye-karti-2000
 *   node scripts/rename-gift-card-2000-slug.mjs
 */
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

const OLD = "manual-2000-try";
const NEW = "hediye-karti-2000";

const { data: before } = await admin
  .from("gift_card_denominations")
  .select("slug, product_id, products:product_id(slug)")
  .in("slug", [OLD, NEW]);

console.log("Önce:", JSON.stringify(before, null, 2));

const { data: prod } = await admin.from("products").select("id,slug").eq("slug", OLD).maybeSingle();
if (prod) {
  const { error } = await admin.from("products").update({ slug: NEW, sku: "HEDIYE_KARTI_2000" }).eq("id", prod.id);
  if (error) {
    console.error("products güncelleme:", error.message);
    process.exit(1);
  }
  console.log("products slug güncellendi:", prod.id);
}

const { error: denomErr } = await admin.from("gift_card_denominations").update({ slug: NEW }).eq("slug", OLD);
if (denomErr) {
  console.error("denomination güncelleme:", denomErr.message);
  process.exit(1);
}

const { data: after } = await admin
  .from("gift_card_denominations")
  .select("slug, product_id, products:product_id(slug)")
  .eq("slug", NEW);

console.log("Sonra:", JSON.stringify(after, null, 2));
