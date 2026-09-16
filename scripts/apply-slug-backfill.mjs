/**
 * Onaylı 14 ürün slug backfill + url_redirects.
 *
 *   node scripts/apply-slug-backfill.mjs           # dry-run (varsayılan)
 *   node scripts/apply-slug-backfill.mjs --apply   # yazar
 *
 * ZL-LUCKY-777 ve Zelula382 hariç (onaysız).
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

/** Onaylı liste — ZL-LUCKY-777 / Zelula382 yok. */
const APPROVED_SKUS = [
  "Zelula102",
  "Zelula112",
  "Zelula204",
  "Zelula222",
  "Zelula226",
  "Zelula227",
  "Zelula228",
  "Zelula245",
  "Zelula375",
  "Zelula376",
  "Zelula377",
  "Zelula378",
  "Zelula379",
  "Zelula93",
];

function slugifyTrFromName(name) {
  let s = String(name ?? "").trim();
  const pairs = [
    ["ğ", "g"],
    ["ü", "u"],
    ["ş", "s"],
    ["ı", "i"],
    ["ö", "o"],
    ["ç", "c"],
    ["Ğ", "g"],
    ["Ü", "u"],
    ["Ş", "s"],
    ["İ", "i"],
    ["I", "i"],
    ["Ö", "o"],
    ["Ç", "c"],
  ];
  for (const [a, b] of pairs) s = s.split(a).join(b);
  s = s.toLocaleLowerCase("tr-TR");
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s || "urun";
}

function sanitizeGeneratedSlug(slug) {
  let out = slug;
  out = out.replace(/(?:-(?:ig|instagram|source))+$/i, "");
  out = out.replace(/-(?:ig|instagram|source)-[a-z0-9]+$/i, "");
  return out.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function productPath(slug) {
  return `/urunler/${slug}`;
}

function rootPath(slug) {
  return `/${slug}`;
}

const apply = process.argv.includes("--apply");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY gerekli");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: products, error } = await admin
  .from("products")
  .select("id,sku,name,slug")
  .in("sku", APPROVED_SKUS);

if (error) {
  console.error("products fetch failed:", error.message);
  process.exit(1);
}

const bySku = new Map((products ?? []).map((p) => [String(p.sku), p]));
const missing = APPROVED_SKUS.filter((sku) => !bySku.has(sku));

/** @type {Array<{sku:string,name:string,old:string,neu:string,status:string,detail?:string}>} */
const plan = [];

for (const sku of APPROVED_SKUS) {
  const p = bySku.get(sku);
  if (!p) {
    plan.push({
      sku,
      name: "",
      old: "",
      neu: "",
      status: "ATLANDI",
      detail: "SKU bulunamadı",
    });
    continue;
  }

  const oldSlug = String(p.slug ?? "").trim();
  const neu = sanitizeGeneratedSlug(slugifyTrFromName(p.name));

  if (!neu || neu === "urun") {
    plan.push({
      sku,
      name: p.name ?? "",
      old: oldSlug,
      neu,
      status: "ATLANDI",
      detail: "yeni slug üretilemedi",
    });
    continue;
  }

  if (oldSlug === neu) {
    plan.push({
      sku,
      name: p.name ?? "",
      old: oldSlug,
      neu,
      status: "ZATEN_OK",
      detail: "slug zaten hedefte",
    });
    continue;
  }

  const { data: collision } = await admin
    .from("products")
    .select("id,sku")
    .eq("slug", neu)
    .neq("id", p.id)
    .maybeSingle();

  if (collision) {
    plan.push({
      sku,
      name: p.name ?? "",
      old: oldSlug,
      neu,
      status: "ATLANDI",
      detail: `yeni slug çakışması → ${collision.sku}`,
    });
    continue;
  }

  plan.push({
    sku,
    name: p.name ?? "",
    old: oldSlug,
    neu,
    status: "UYGULANACAK",
  });
}

console.log(apply ? "=== APPLY ===" : "=== DRY-RUN (yazma yok) ===");
console.log("SKU | ürün adı | eski slug | yeni slug | durum | not");
console.log("-".repeat(120));
for (const row of plan) {
  console.log(
    `${row.sku} | ${row.name} | ${row.old} | ${row.neu} | ${row.status}${row.detail ? ` | ${row.detail}` : ""}`,
  );
}

const toApply = plan.filter((r) => r.status === "UYGULANACAK");
const skipped = plan.filter((r) => r.status === "ATLANDI");
const already = plan.filter((r) => r.status === "ZATEN_OK");

console.log(
  `\nÖzet: uygulanacak=${toApply.length}, atlanan=${skipped.length}, zaten_ok=${already.length}, eksik_sku=${missing.length}`,
);

if (!apply) {
  console.log("\nYazmak için: node scripts/apply-slug-backfill.mjs --apply");
  process.exit(0);
}

let ok = 0;
let fail = 0;

for (const row of toApply) {
  const p = bySku.get(row.sku);
  const oldSlug = row.old;
  const newSlug = row.neu;
  const oldProduct = productPath(oldSlug);
  const newProduct = productPath(newSlug);
  const oldRoot = rootPath(oldSlug);

  // a) products.slug
  const { error: updErr } = await admin.from("products").update({ slug: newSlug }).eq("id", p.id);
  if (updErr) {
    console.error(`[FAIL] ${row.sku} products.update: ${updErr.message}`);
    fail += 1;
    continue;
  }

  // Zincir sıkıştır: eski hedeflere giden kayıtlar → yeni ürün yolu
  await admin.from("url_redirects").update({ to_path: newProduct }).eq("to_path", oldProduct);
  await admin.from("url_redirects").update({ to_path: newProduct }).eq("to_path", oldRoot);

  // Yeni hedef başka birinden from olmasın
  await admin.from("url_redirects").delete().eq("from_path", newProduct);
  await admin.from("url_redirects").delete().eq("from_path", rootPath(newSlug));

  // b) /urunler/{eski} → /urunler/{yeni}
  // c) /{eski} → /urunler/{yeni} (direkt, zincirsiz)
  const redirects = [
    {
      from_path: oldProduct,
      to_path: newProduct,
      status_code: 301,
      note: `slug backfill ${row.sku}`,
    },
    {
      from_path: oldRoot,
      to_path: newProduct,
      status_code: 301,
      note: `slug backfill root ${row.sku}`,
    },
  ];

  const { error: redErr } = await admin.from("url_redirects").upsert(redirects, {
    onConflict: "from_path",
  });

  if (redErr) {
    console.error(`[FAIL] ${row.sku} url_redirects: ${redErr.message} (slug güncellendi, redirect eksik olabilir)`);
    fail += 1;
    continue;
  }

  console.log(`[OK] ${row.sku}: ${oldSlug} → ${newSlug}`);
  console.log(`     301 ${oldProduct} → ${newProduct}`);
  console.log(`     301 ${oldRoot} → ${newProduct}`);
  ok += 1;
}

console.log(`\nApply bitti: ok=${ok}, fail=${fail}`);
process.exit(fail > 0 ? 1 : 0);
