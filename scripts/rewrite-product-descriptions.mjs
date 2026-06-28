/**
 * Şablon/tekrarlayan ürün uzun açıklamalarını SEO-dostu benzersiz metinlerle yeniler.
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Örnekler:
 *   node scripts/rewrite-product-descriptions.mjs
 *   node scripts/rewrite-product-descriptions.mjs --all
 *   node scripts/rewrite-product-descriptions.mjs --slug=zelula-artisan-fish-kupe
 *   APPLY=YES_REWRITE_PRODUCT_DESCRIPTIONS node scripts/rewrite-product-descriptions.mjs
 *   APPLY=YES_REWRITE_PRODUCT_DESCRIPTIONS node scripts/rewrite-product-descriptions.mjs --export=tmp/descriptions-preview.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  STANDARD_CARE_PARAGRAPH,
  buildFingerprintCounts,
  generateUniqueFullDescription,
  isTemplatedDescription,
  mapProductRow,
  planDescriptionBatch,
} from "./lib/product-description-rewrite.mjs";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
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
loadEnvFile(path.join(projectRoot, ".env"));

const args = process.argv.slice(2);
const rewriteAll = args.includes("--all");
const slugFilter = args.find((a) => a.startsWith("--slug="))?.split("=").slice(1).join("=") ?? "";
const exportPath = args.find((a) => a.startsWith("--export="))?.split("=").slice(1).join("=") ?? "";
const apply = process.env.APPLY === "YES_REWRITE_PRODUCT_DESCRIPTIONS";
const includeInactive = process.env.INCLUDE_INACTIVE === "YES";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

function supabaseProjectRef(supabaseUrl) {
  try {
    const host = new URL(String(supabaseUrl)).hostname;
    const ref = host.split(".")[0];
    return ref || host;
  } catch {
    return "(invalid URL)";
  }
}

function envSourceHint() {
  const fromShell = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) fromShell.push("NEXT_PUBLIC_SUPABASE_URL");
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) fromShell.push("SUPABASE_SERVICE_ROLE_KEY");
  if (fromShell.length === 0) return "Yüklendi: .env.local → .env (shell'de önceden set edilmiş değer yok)";
  return `UYARI: Shell ortamında zaten set: ${fromShell.join(", ")} — .env.local bu anahtarları EZEMEZ`;
}

const PRODUCT_SELECT =
  "id,name,slug,sku,short_description,full_description,material,color,product_kind,is_active,categories(name,slug),collections(name,slug)";

async function fetchProductCount(admin, { activeOnly }) {
  let q = admin.from("products").select("id", { count: "exact", head: true });
  if (activeOnly) q = q.eq("is_active", true);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/** PostgREST varsayılan limiti 1000; tüm satırlar için sayfalı çek. */
async function fetchAllProducts(admin, { activeOnly }) {
  const pageSize = 1000;
  const all = [];
  for (let from = 0; ; from += pageSize) {
    let q = admin
      .from("products")
      .select(PRODUCT_SELECT)
      .order("name", { ascending: true })
      .range(from, from + pageSize - 1);
    if (activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) throw error;
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}

if (!url || !serviceRole) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local).");
  process.exit(1);
}

const admin = createClient(url, serviceRole, { auth: { persistSession: false } });

console.log("=== Bağlantı ===");
console.log(`Supabase project: ${supabaseProjectRef(url)}`);
console.log(`URL host: ${new URL(url).hostname}`);
console.log(envSourceHint());
console.log(`Filtre: is_active = true (INCLUDE_INACTIVE=YES ile tüm ürünler)`);
console.log("");

console.log("=== products tablosu (açıklama alanları) ===\n");
console.log(`CREATE TABLE public.products (
  ...
  name              text NOT NULL,
  slug              text NOT NULL UNIQUE,
  short_description text NOT NULL,   -- 1 cümle; liste/kart önizlemesi
  full_description  text NOT NULL,   -- uzun açıklama (emoji maddeler + kapanış + bakım)
  material          text,
  color             text,
  category_id       uuid → categories(name, slug),
  collection_id     uuid → collections(name, slug),
  product_kind      text DEFAULT 'physical',  -- 'gift_card' hariç tutulur
  ...
);`);
console.log("\nKaynak: supabase/schema.sql + migrations\n");

console.log("=== Kullanılan sorgu (Supabase JS) ===\n");
console.log(`admin
  .from("products")
  .select("${PRODUCT_SELECT}")
  .order("name", { ascending: true })
  .range(from, from + 999)   // sayfalı; her sayfa max 1000 satır
  ${includeInactive ? "" : '.eq("is_active", true)  // varsayılan'}
`);
console.log("");

let countAll = 0;
let countActive = 0;
try {
  [countAll, countActive] = await Promise.all([
    fetchProductCount(admin, { activeOnly: false }),
    fetchProductCount(admin, { activeOnly: true }),
  ]);
  console.log(`DB sayımı (head): toplam=${countAll}, is_active=true=${countActive}, pasif=${countAll - countActive}`);
} catch (countErr) {
  console.warn("Sayım alınamadı:", countErr.message);
}

let rows;
try {
  rows = await fetchAllProducts(admin, { activeOnly: !includeInactive });
} catch (fetchErr) {
  console.error("Ürünler alınamadı:", fetchErr.message);
  process.exit(1);
}

if (!includeInactive && countActive > 0 && rows.length !== countActive) {
  console.warn(
    `UYARI: Aktif sayım ${countActive} ama çekilen ${rows.length} — ilişkili select veya RLS sorunu olabilir.`,
  );
}

let products = rows.map(mapProductRow);
if (slugFilter) {
  products = products.filter((p) => p.slug === slugFilter);
}

const fingerprintCounts = buildFingerprintCounts(products);
const candidates = products.filter((p) => {
  if (p.product_kind === "gift_card") return false;
  if (rewriteAll) return true;
  return isTemplatedDescription(p, fingerprintCounts);
});

console.log(`Toplam ürün (çekilen): ${products.length}`);
if (countAll > 0) console.log(`Toplam ürün (DB): ${countAll} | aktif: ${countActive}`);
console.log(`Şablon/tekrar adayı: ${candidates.length}${rewriteAll ? " (--all)" : ""}`);
console.log(`Mod: ${apply ? "UYGULA (DB güncelle)" : "DRY RUN (önizleme)"}`);
console.log(`Standart bakım paragrafı tüm ürünlerde aynı kalır.\n`);

if (candidates.length === 0) {
  console.log("Güncellenecek ürün yok.");
  process.exit(0);
}

const preview = [];
let updated = 0;
let failed = 0;

const batchPlan = planDescriptionBatch(candidates);

for (let i = 0; i < candidates.length; i += 1) {
  const product = candidates[i];
  const nextFull = generateUniqueFullDescription(product, i, batchPlan);
  const reasons = [];
  if (isTemplatedDescription(product, fingerprintCounts)) reasons.push("templated");
  if (rewriteAll) reasons.push("forced");

  preview.push({
    id: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    reason: reasons.join(","),
    short_description: product.short_description,
    before_full_description: product.full_description,
    after_full_description: nextFull,
  });

  console.log("─".repeat(72));
  console.log(`${product.sku} | ${product.name}`);
  console.log(`slug: ${product.slug} | kategori: ${product.categorySlug ?? "—"}`);
  console.log(`neden: ${reasons.join(", ") || "—"}`);
  console.log("\n[ÖNCE — ilk 280 karakter]");
  console.log(String(product.full_description ?? "").slice(0, 280).replace(/\n/g, " ↵ "));
  console.log("\n[SONRA — ilk 280 karakter]");
  console.log(nextFull.slice(0, 280).replace(/\n/g, " ↵ "));
  console.log(`\n… bakım (${STANDARD_CARE_PARAGRAPH.length} karakter, sabit)`);

  if (!apply) continue;

  const { error: updateError } = await admin
    .from("products")
    .update({ full_description: nextFull })
    .eq("id", product.id);

  if (updateError) {
    failed += 1;
    console.error(`HATA güncelleme: ${updateError.message}`);
  } else {
    updated += 1;
  }
}

if (exportPath) {
  const abs = path.isAbsolute(exportPath) ? exportPath : path.join(projectRoot, exportPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(preview, null, 2), "utf8");
  console.log(`\nDışa aktarıldı: ${abs}`);
}

console.log("\n=== Özet ===");
if (apply) {
  console.log(`Güncellenen: ${updated}, hata: ${failed}`);
} else {
  console.log(`${candidates.length} ürün için önizleme üretildi.`);
  console.log("Uygulamak için:");
  console.log("  APPLY=YES_REWRITE_PRODUCT_DESCRIPTIONS node scripts/rewrite-product-descriptions.mjs");
  console.log("Tüm aktif fiziksel ürünler:");
  console.log("  APPLY=YES_REWRITE_PRODUCT_DESCRIPTIONS node scripts/rewrite-product-descriptions.mjs --all");
}
