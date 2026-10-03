/**
 * Ürün açıklamalarındaki "İade: …" satırlarını kaldırır (dry-run varsayılan).
 *
 * Kullanım:
 *   node scripts/strip-product-return-lines.mjs
 *   node scripts/strip-product-return-lines.mjs --apply
 *
 * PDP'de sabit İade kartı zaten gösterildiği için açıklamadaki satır çift görünüm yaratır.
 * --apply olmadan yalnızca etkilenecek ürünleri listeler; DB yazmaz.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 0) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (process.env[key] == null) process.env[key] = value;
}

const apply = process.argv.includes("--apply");
const RETURN_LINE_RE = /^[ \t]*[•\-*]?\s*İade\s*:\s*.+$/gim;

function stripReturnLines(text) {
  const raw = String(text ?? "");
  if (!RETURN_LINE_RE.test(raw)) return { changed: false, next: raw };
  RETURN_LINE_RE.lastIndex = 0;
  const next = raw
    .replace(RETURN_LINE_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trimEnd();
  return { changed: next !== raw, next };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Supabase env eksik.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await admin
  .from("products")
  .select("id,sku,slug,short_description,full_description")
  .order("created_at", { ascending: false });

if (error) {
  console.error(error.message);
  process.exit(1);
}

const planned = [];
for (const p of data ?? []) {
  const short = stripReturnLines(p.short_description);
  const full = stripReturnLines(p.full_description);
  if (!short.changed && !full.changed) continue;
  planned.push({
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    shortChanged: short.changed,
    fullChanged: full.changed,
    shortNext: short.next,
    fullNext: full.next,
  });
}

console.log(
  JSON.stringify(
    {
      mode: apply ? "APPLY" : "DRY_RUN",
      matched: planned.length,
      sample: planned.slice(0, 10).map((p) => ({
        sku: p.sku,
        slug: p.slug,
        shortChanged: p.shortChanged,
        fullChanged: p.fullChanged,
      })),
    },
    null,
    2,
  ),
);

if (!apply) {
  console.log("\nDB yazılmadı. Uygulamak için: node scripts/strip-product-return-lines.mjs --apply");
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const p of planned) {
  const patch = {};
  if (p.shortChanged) patch.short_description = p.shortNext;
  if (p.fullChanged) patch.full_description = p.fullNext;
  const { error: upErr } = await admin.from("products").update(patch).eq("id", p.id);
  if (upErr) {
    fail += 1;
    console.error("update failed", p.sku, upErr.message);
  } else {
    ok += 1;
  }
}
console.log(JSON.stringify({ updated: ok, failed: fail }, null, 2));
