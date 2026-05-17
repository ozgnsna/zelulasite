import type { SupabaseClient } from "@supabase/supabase-js";
import type { GiftCardDenomination } from "@/lib/gift-cards/types";
import { unwrapSupabaseRelation } from "@/lib/gift-cards/unwrap-relation";

export type GiftCardAdminSummary = {
  denominations: GiftCardDenomination[];
  issuedCount: number;
  activeCount: number;
  outstandingBalanceTry: number;
  loadError: string | null;
};

export async function fetchGiftCardAdminSummary(
  admin: SupabaseClient,
): Promise<GiftCardAdminSummary> {
  try {
    const [denomRes, issuedRes, activeRes] = await Promise.all([
      admin
        .from("gift_card_denominations")
        .select(
          "id, amount, currency, label, slug, sort_order, image_url, product_id, is_active, products:product_id ( id, slug, price, is_active )",
        )
        .order("sort_order", { ascending: true }),
      admin.from("gift_cards").select("id", { count: "exact", head: true }),
      admin
        .from("gift_cards")
        .select("balance_remaining")
        .eq("status", "active"),
    ]);

    const denominations: GiftCardDenomination[] = (denomRes.data ?? []).map((row) => {
      const product = unwrapSupabaseRelation(row.products);
      const productId = row.product_id ?? product?.id ?? null;
      const productActive = product?.is_active !== false && row.is_active !== false;
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
      };
    });

    const outstandingBalanceTry = (activeRes.data ?? []).reduce(
      (sum, row) => sum + Number(row.balance_remaining ?? 0),
      0,
    );

    return {
      denominations,
      issuedCount: issuedRes.count ?? 0,
      activeCount: activeRes.data?.length ?? 0,
      outstandingBalanceTry,
      loadError: denomRes.error?.message ?? issuedRes.error?.message ?? activeRes.error?.message ?? null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yüklenemedi";
    return {
      denominations: [],
      issuedCount: 0,
      activeCount: 0,
      outstandingBalanceTry: 0,
      loadError: msg,
    };
  }
}
