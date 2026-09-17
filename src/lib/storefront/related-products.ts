import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/types";

export type RelatedProductSeed = {
  id: string;
  price: number;
  category_id: string | null;
  collection_id: string | null;
  target_audience?: string | null;
};

const PRODUCT_SELECT =
  "*, category:categories(*), collection:collections(*), product_images(*)";

function byPriceDistance(anchorPrice: number) {
  return (a: Product, b: Product) => {
    const da = Math.abs(Number(a.price) - anchorPrice);
    const db = Math.abs(Number(b.price) - anchorPrice);
    if (da !== db) return da - db;
    // tie-break: featured first, then newer
    if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
    return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
  };
}

function mergeUnique(into: Product[], more: Product[], excludeIds: Set<string>, limit: number) {
  for (const p of more) {
    if (into.length >= limit) break;
    if (excludeIds.has(p.id)) continue;
    excludeIds.add(p.id);
    into.push(p);
  }
  return into;
}

/**
 * Benzer ürünler: aynı kategori + fiyat yakınlığı, sonra koleksiyon, sonra hedef kitle.
 * Yalnızca aktif ve stok > 0.
 */
export async function fetchRelatedProducts(
  client: SupabaseClient,
  seed: RelatedProductSeed,
  limit = 6,
): Promise<Product[]> {
  const anchorPrice = Number(seed.price);
  const exclude = new Set<string>([seed.id]);
  const out: Product[] = [];

  const base = () =>
    client
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .neq("id", seed.id)
      .or("product_kind.is.null,product_kind.eq.physical")
      .limit(48);

  if (seed.category_id) {
    const { data } = await base().eq("category_id", seed.category_id);
    const sorted = ([...(data ?? [])] as Product[]).sort(byPriceDistance(anchorPrice));
    mergeUnique(out, sorted, exclude, limit);
  }

  if (out.length < limit && seed.collection_id) {
    const { data } = await base().eq("collection_id", seed.collection_id);
    const sorted = ([...(data ?? [])] as Product[])
      .filter((p) => !exclude.has(p.id))
      .sort(byPriceDistance(anchorPrice));
    mergeUnique(out, sorted, exclude, limit);
  }

  if (out.length < limit && seed.target_audience) {
    const { data } = await base().eq("target_audience", seed.target_audience);
    const sorted = ([...(data ?? [])] as Product[])
      .filter((p) => !exclude.has(p.id))
      .sort(byPriceDistance(anchorPrice));
    mergeUnique(out, sorted, exclude, limit);
  }

  return out.slice(0, limit);
}
