import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductVariant } from "@/lib/types";

function toVariant(row: Record<string, unknown>): ProductVariant {
  return {
    id: String(row.id ?? ""),
    product_id: String(row.product_id ?? ""),
    label: String(row.label ?? "").trim(),
    sku: row.sku ? String(row.sku) : null,
    stock_quantity: Math.max(0, Math.floor(Number(row.stock_quantity ?? 0))),
    sort_order: Number(row.sort_order ?? 0),
    is_active: row.is_active !== false,
  };
}

function sortVariants(a: ProductVariant, b: ProductVariant): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  const an = Number(a.label);
  const bn = Number(b.label);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return a.label.localeCompare(b.label, "tr-TR");
}

/** Tek ürünün aktif varyantları (örn. yüzük ölçüleri), sıralı. */
export async function fetchProductVariants(
  supabase: SupabaseClient,
  productId: string,
): Promise<ProductVariant[]> {
  const id = String(productId ?? "").trim();
  if (!id) return [];
  const { data, error } = await supabase
    .from("product_variants")
    .select("id,product_id,label,sku,stock_quantity,sort_order,is_active")
    .eq("product_id", id)
    .eq("is_active", true);
  if (error || !data) return [];
  return data.map((r) => toVariant(r as Record<string, unknown>)).sort(sortVariants);
}

/** Birden çok ürün için varyantları product_id -> ProductVariant[] olarak getirir. */
export async function fetchVariantsForProducts(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Map<string, ProductVariant[]>> {
  const ids = [...new Set(productIds.map((x) => String(x ?? "").trim()).filter(Boolean))];
  const byProduct = new Map<string, ProductVariant[]>();
  if (ids.length === 0) return byProduct;
  const { data, error } = await supabase
    .from("product_variants")
    .select("id,product_id,label,sku,stock_quantity,sort_order,is_active")
    .in("product_id", ids)
    .eq("is_active", true);
  if (error || !data) return byProduct;
  for (const row of data) {
    const v = toVariant(row as Record<string, unknown>);
    if (!v.product_id) continue;
    const list = byProduct.get(v.product_id) ?? [];
    list.push(v);
    byProduct.set(v.product_id, list);
  }
  for (const list of byProduct.values()) list.sort(sortVariants);
  return byProduct;
}
