/**
 * Hediye kartı denomination düzenleme (okuma + uygulama)
 *   node scripts/fix-gift-card-denominations.mjs           # önce mevcut durum
 *   node scripts/fix-gift-card-denominations.mjs --apply   # sil + 2000₺ yapılandır
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

const apply = process.argv.includes("--apply");

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TABLE = "gift_card_denominations";
const DELETE_SLUGS = ["manual-2600-try", "manual-5000-try"];
const TARGET_2000_SLUG = "manual-2000-try";
const KEEP_SLUGS = ["hediye-karti-500", "hediye-karti-750", "hediye-karti-1000", TARGET_2000_SLUG];

console.log("=== Tablo yapısı: gift_card_denominations ===");
console.log(
  JSON.stringify(
    {
      columns: [
        "id (uuid PK)",
        "amount (numeric)",
        "currency (text)",
        "label (text)",
        "slug (text unique)",
        "is_active (boolean)",
        "sort_order (int)",
        "image_url (text)",
        "product_id (uuid FK → products.id)",
        "created_at",
        "updated_at",
      ],
      related: "products (product_kind=gift_card) via product_id + slug eşlemesi",
    },
    null,
    2,
  ),
);

const { data: all, error: listErr } = await admin
  .from(TABLE)
  .select(
    "id, amount, currency, label, slug, is_active, sort_order, image_url, product_id, products:product_id ( id, slug, price, is_active, product_kind, stock_quantity )",
  )
  .order("sort_order", { ascending: true });

if (listErr) {
  console.error("Liste hatası:", listErr.message);
  process.exit(1);
}

console.log("\n=== Mevcut kayıtlar ===");
for (const row of all ?? []) {
  const p = Array.isArray(row.products) ? row.products[0] : row.products;
  console.log(
    JSON.stringify({
      id: row.id,
      amount: row.amount,
      slug: row.slug,
      label: row.label,
      is_active: row.is_active,
      product_id: row.product_id,
      product: p
        ? { id: p.id, slug: p.slug, price: p.price, is_active: p.is_active, kind: p.product_kind }
        : null,
    }),
  );
}

if (!apply) {
  console.log("\n(Dry-run) Uygulamak için: node scripts/fix-gift-card-denominations.mjs --apply");
  process.exit(0);
}

// 1) Silinecek slug'lar — önce gift_cards referansı var mı?
for (const slug of DELETE_SLUGS) {
  const row = (all ?? []).find((r) => r.slug === slug);
  if (!row) {
    console.log(`\n[skip] ${slug} bulunamadı`);
    continue;
  }
  const { count } = await admin.from("gift_cards").select("id", { count: "exact", head: true }).eq("denomination_id", row.id);
  if ((count ?? 0) > 0) {
    const { error: deactErr } = await admin.from(TABLE).update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", row.id);
    if (deactErr) {
      console.error(`Pasife alma hatası (${slug}):`, deactErr.message);
      process.exit(1);
    }
    console.log(`\n[deactivated] ${slug} — ${count} üretilmiş kart var, denomination silinemez (FK restrict)`);
    continue;
  }
  const productId = row.product_id;
  const { error: delDenom } = await admin.from(TABLE).delete().eq("id", row.id);
  if (delDenom) {
    console.error(`Denomination silme hatası (${slug}):`, delDenom.message);
    process.exit(1);
  }
  console.log(`\n[deleted] denomination ${slug}`);
  if (productId) {
    const { error: delProd } = await admin.from("products").delete().eq("id", productId);
    if (delProd) console.warn(`  ürün silinemedi (${productId}):`, delProd.message);
    else console.log(`  [deleted] product ${productId}`);
  }
}

// 2) manual-2000-try yapılandır
const ref500 = (all ?? []).find((r) => r.slug === "hediye-karti-500");
const refProduct = ref500?.products;
const refP = Array.isArray(refProduct) ? refProduct[0] : refProduct;

let denom2000 = (all ?? []).find((r) => r.slug === TARGET_2000_SLUG);
if (!denom2000) {
  const { data: inserted, error: insErr } = await admin
    .from(TABLE)
    .insert({
      amount: 2000,
      currency: "TRY",
      label: "2000 ₺ Dijital Hediye Kartı",
      slug: TARGET_2000_SLUG,
      sort_order: 40,
      is_active: true,
      image_url: ref500?.image_url ?? null,
    })
    .select("id")
    .single();
  if (insErr) {
    console.error("2000 denomination insert:", insErr.message);
    process.exit(1);
  }
  denom2000 = { id: inserted.id, slug: TARGET_2000_SLUG, product_id: null };
  console.log("\n[created] denomination manual-2000-try");
}

let productId = denom2000.product_id;
if (!productId) {
  const { data: existingProd } = await admin
    .from("products")
    .select("id")
    .eq("slug", TARGET_2000_SLUG)
    .maybeSingle();
  if (existingProd?.id) {
    productId = existingProd.id;
  } else {
    const { data: newProd, error: prodErr } = await admin
      .from("products")
      .insert({
        name: "2000 ₺ Dijital Hediye Kartı",
        slug: TARGET_2000_SLUG,
        short_description: "Dijital hediye kartı — kod alıcı e-postasına iletilir.",
        full_description:
          "Zelula dijital hediye kartı. Ödeme sonrası benzersiz kod, seçtiğiniz alıcı e-posta adresine gönderilir. Kod sepette kısmi kullanılabilir.",
        price: 2000,
        sku: "HEDIYE_KARTI_2000",
        stock_quantity: 9999,
        product_kind: "gift_card",
        is_active: true,
        featured: false,
        new_arrival: false,
      })
      .select("id")
      .single();
    if (prodErr) {
      console.error("2000 product insert:", prodErr.message);
      process.exit(1);
    }
    productId = newProd.id;
    console.log(`[created] product ${productId}`);
  }
}

const { error: linkErr } = await admin
  .from(TABLE)
  .update({
    product_id: productId,
    is_active: true,
    amount: 2000,
    label: "2000 ₺ Dijital Hediye Kartı",
    sort_order: 40,
    image_url: ref500?.image_url ?? denom2000.image_url ?? null,
    updated_at: new Date().toISOString(),
  })
  .eq("id", denom2000.id);

if (linkErr) {
  console.error("2000 denomination link:", linkErr.message);
  process.exit(1);
}

const { error: prodUpdErr } = await admin
  .from("products")
  .update({
    product_kind: "gift_card",
    price: 2000,
    stock_quantity: 9999,
    is_active: true,
    name: "2000 ₺ Dijital Hediye Kartı",
  })
  .eq("id", productId);

if (prodUpdErr) {
  console.error("2000 product update:", prodUpdErr.message);
  process.exit(1);
}

// Hediye kartı kategorisi
const { data: cat } = await admin.from("categories").select("id").eq("slug", "hediye-karti").maybeSingle();
if (cat?.id) {
  await admin.from("products").update({ category_id: cat.id }).eq("id", productId);
}

// Görsel: 500₺ ile aynı
if (refP?.id) {
  const { data: refImages } = await admin
    .from("product_images")
    .select("image_url, is_cover, sort_order")
    .eq("product_id", refP.id)
    .order("sort_order", { ascending: true });
  if (refImages?.length) {
    await admin.from("product_images").delete().eq("product_id", productId);
    await admin.from("product_images").insert(
      refImages.map((img) => ({
        product_id: productId,
        image_url: img.image_url,
        is_cover: img.is_cover,
        sort_order: img.sort_order,
      })),
    );
  }
}

console.log(`[linked] manual-2000-try → product ${productId}`);

// 3) Diğer tutarları satışta tut
for (const slug of ["hediye-karti-500", "hediye-karti-750", "hediye-karti-1000"]) {
  const row = (all ?? []).find((r) => r.slug === slug);
  if (!row?.product_id) continue;
  await admin.from(TABLE).update({ is_active: true }).eq("slug", slug);
  await admin.from("products").update({ is_active: true, product_kind: "gift_card" }).eq("id", row.product_id);
}

// Son durum
const { data: final } = await admin
  .from(TABLE)
  .select("amount, slug, is_active, product_id, products:product_id ( id, is_active )")
  .eq("is_active", true)
  .order("sort_order", { ascending: true });

console.log("\n=== Son durum ===");
for (const row of final ?? []) {
  const p = Array.isArray(row.products) ? row.products[0] : row.products;
  const configured = Boolean(row.product_id && p?.is_active !== false && row.is_active);
  console.log(`${row.slug} | ${row.amount} TRY | product=${row.product_id ?? "—"} | ${configured ? "Satışta" : "Yapılandırılmadı"}`);
}

const extra = (final ?? []).filter((r) => !KEEP_SLUGS.includes(r.slug));
if (extra.length > 0) {
  console.warn("\n[warn] Beklenmeyen ek denomination:", extra.map((r) => r.slug).join(", "));
}
