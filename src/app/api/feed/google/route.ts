import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteOrigin } from "@/lib/seo/site";
import {
  buildGoogleMerchantFeed,
  renderGoogleMerchantRss,
  type GoogleFeedProductRow,
} from "@/lib/feeds/google-merchant";

/** CDN: 30 dk taze, ardından 1 saat stale. force-dynamic Cache-Control'ü ezer. */
export const revalidate = 1800;

const SITE_URL = getSiteOrigin();

const FEED_SELECT = [
  "id",
  "slug",
  "name",
  "sku",
  "short_description",
  "full_description",
  "price",
  "compare_at_price",
  "stock_quantity",
  "material",
  "product_kind",
  "category:categories(name,slug)",
  "product_images(image_url,is_cover,sort_order)",
  "product_variants(id,label,stock_quantity,is_active)",
].join(",");

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select(FEED_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return new Response("Feed oluşturulamadı.", { status: 500 });
  }

  const rows = (data ?? []) as unknown as GoogleFeedProductRow[];
  const result = buildGoogleMerchantFeed(rows, SITE_URL);

  for (const slug of result.skippedNoImageSlugs) {
    console.warn("[google-feed] image_link yok, ürün elendi", { slug });
  }
  for (const slug of result.skippedNoSkuSlugs) {
    console.warn("[google-feed] SKU yok, ürün elendi", { slug });
  }
  console.info("[google-feed] özet", {
    included: result.included,
    skippedNoImage: result.skippedNoImage,
    skippedNoSku: result.skippedNoSku,
    skippedIdTooLong: result.skippedIdTooLong,
    skippedInvalid: result.skippedInvalid,
    skippedGiftCard: result.skippedGiftCard,
  });

  const xml = renderGoogleMerchantRss(result.itemsXml, SITE_URL);

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      "X-Feed-Included": String(result.included),
      "X-Feed-Skipped-No-Image": String(result.skippedNoImage),
    },
  });
}
