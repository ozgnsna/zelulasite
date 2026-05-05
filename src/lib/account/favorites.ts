import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/types";

export async function listFavoriteProductIdsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("customer_product_favorites")
    .select("product_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r) => String(r.product_id));
}

export async function isProductFavorited(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("customer_product_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.id);
}

export async function listFavoriteProductsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Product[]> {
  const ids = await listFavoriteProductIdsForUser(supabase, userId);
  if (ids.length === 0) return [];
  const { data: products, error } = await supabase
    .from("products")
    .select("*, category:categories(*), collection:collections(*), product_images(*)")
    .in("id", ids)
    .eq("is_active", true);
  if (error || !products?.length) return [];
  const byId = new Map((products as Product[]).map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
}
