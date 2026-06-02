import { createAdminClient } from "@/lib/supabase/admin";
import { pickProductCoverImageUrl } from "@/lib/products/cover-image";

export const dynamic = "force-dynamic";

const SITE_URL = (() => {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env && env.startsWith("https://")) return env.replace(/\/+$/, "");
  return "https://zeluladesign.com";
})();

const BRAND = "Zelula";
/** Google ürün taksonomisi: Apparel & Accessories > Jewelry */
const GOOGLE_PRODUCT_CATEGORY = "201";

type FeedProductRow = {
  slug: string | null;
  name: string | null;
  short_description: string | null;
  price: number | null;
  stock_quantity: number | null;
  product_images?: { image_url?: string | null; is_cover?: boolean | null; sort_order?: number | null }[] | null;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildItem(p: FeedProductRow): string | null {
  const slug = String(p.slug ?? "").trim();
  const name = String(p.name ?? "").trim();
  if (!slug || !name) return null;

  const description = String(p.short_description ?? "").trim();
  const link = `${SITE_URL}/urunler/${slug}`;
  const imageLink = pickProductCoverImageUrl(p.product_images, "");
  const price = `${Number(p.price ?? 0).toFixed(2)} TRY`;
  const inStock = Number(p.stock_quantity ?? 0) > 0;
  const availability = inStock ? "in_stock" : "out_of_stock";

  const fields: string[] = [
    `<g:id>${escapeXml(slug)}</g:id>`,
    `<g:title>${escapeXml(name)}</g:title>`,
    `<g:description>${escapeXml(description)}</g:description>`,
    `<g:link>${escapeXml(link)}</g:link>`,
    imageLink ? `<g:image_link>${escapeXml(imageLink)}</g:image_link>` : "",
    `<g:price>${escapeXml(price)}</g:price>`,
    `<g:availability>${availability}</g:availability>`,
    `<g:condition>new</g:condition>`,
    `<g:brand>${escapeXml(BRAND)}</g:brand>`,
    `<g:google_product_category>${GOOGLE_PRODUCT_CATEGORY}</g:google_product_category>`,
  ].filter(Boolean);

  return `    <item>\n      ${fields.join("\n      ")}\n    </item>`;
}

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("slug,name,short_description,price,stock_quantity,product_kind,product_images(image_url,is_cover,sort_order)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return new Response("Feed oluşturulamadı.", { status: 500 });
  }

  const rows = (data ?? []) as (FeedProductRow & { product_kind?: string | null })[];
  const items = rows
    // Dijital hediye kartları fiziksel takı feed'ine dahil edilmez.
    .filter((p) => p.product_kind !== "gift_card")
    .map((p) => buildItem(p))
    .filter((x): x is string => Boolean(x))
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(BRAND)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(`${BRAND} ürün feed'i (Google Merchant Center)`)}</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
