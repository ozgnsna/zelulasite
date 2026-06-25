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

const skus = process.argv.slice(2);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

for (const sku of skus) {
  const { data: p } = await admin.from("products").select("id,sku,stock_quantity").eq("sku", sku).maybeSingle();
  if (!p) {
    console.log(sku, "bulunamadı");
    continue;
  }
  const { data: vars } = await admin
    .from("product_variants")
    .select("id,label,stock_quantity,is_active")
    .eq("product_id", p.id);
  console.log(`\n${sku} site=${p.stock_quantity} variants=${vars?.length ?? 0}`);
  for (const v of vars ?? []) console.log(`  - ${v.label ?? v.id}: ${v.stock_quantity} active=${v.is_active}`);
}
