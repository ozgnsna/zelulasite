import { createClient } from "@/lib/supabase/server";
import type { GiftCardDenomination } from "@/lib/gift-cards/types";
import { unwrapSupabaseRelation } from "@/lib/gift-cards/unwrap-relation";

type DenomProductRow = { id: string; slug: string; price: number | string; is_active: boolean | null };
type DenomRow = {
  id: string;
  amount: number | string;
  currency: string;
  label: string;
  slug: string;
  sort_order: number;
  image_url: string | null;
  product_id: string | null;
  products: DenomProductRow | DenomProductRow[] | null;
};

export async function listActiveGiftCardDenominations(): Promise<GiftCardDenomination[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gift_card_denominations")
      .select(
        "id, amount, currency, label, slug, sort_order, image_url, product_id, products:product_id ( id, slug, price, is_active )",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[gift-cards] denominations:", error.message);
      }
      return [];
    }

    return ((data ?? []) as unknown as DenomRow[]).map((row) => {
      const product = unwrapSupabaseRelation(row.products);
      const productId = row.product_id ?? product?.id ?? null;
      const productActive = product?.is_active !== false;
      return {
        id: row.id,
        amount: Number(row.amount),
        currency: row.currency,
        label: row.label,
        slug: row.slug,
        sortOrder: row.sort_order,
        imageUrl: row.image_url,
        productId: productId && productActive ? productId : null,
        productPrice: product ? Number(product.price) : Number(row.amount),
        productSlug: product?.slug ?? row.slug,
        isConfigured: Boolean(productId && productActive),
      } satisfies GiftCardDenomination;
    });
  } catch {
    return [];
  }
}
