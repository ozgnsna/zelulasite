import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { fetchVariantsForProducts } from "@/lib/products/variants";
import type { GiftCardCartMeta } from "@/lib/gift-cards/types";
import type { CartItem, Product, ProductVariant } from "@/lib/types";

const CART_KEY = "zelula_cart";

export async function getCartItems(): Promise<CartItem[]> {
  const store = await cookies();
  const raw = store.get(CART_KEY)?.value;
  if (!raw) return [];
  try {
    const items = JSON.parse(raw) as CartItem[];
    return items.filter((x) => x.quantity > 0).slice(0, 50);
  } catch {
    return [];
  }
}

export async function setCartItems(items: CartItem[]) {
  const store = await cookies();
  store.set(CART_KEY, JSON.stringify(items), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Clamp cart lines to current DB stock; persist cookie if anything changed. Returns the cart to use for reads. */
export async function reconcileCartCookie(): Promise<CartItem[]> {
  const items = await getCartItems();
  if (items.length === 0) return [];
  try {
    const supabase = await createClient();
    const ids = [...new Set(items.map((x) => x.productId))];
    const { data, error } = await supabase
      .from("products")
      .select("id,stock_quantity,is_active,product_kind")
      .in("id", ids);
    if (error || !data) return items;
    const byId = new Map(
      data.map((r) => [
        r.id,
        r as { id: string; stock_quantity: number | null; is_active: boolean | null; product_kind?: string | null },
      ]),
    );
    const variantsByProduct = await fetchVariantsForProducts(supabase, ids);
    const variantById = new Map<string, ProductVariant>();
    for (const list of variantsByProduct.values()) {
      for (const v of list) variantById.set(v.id, v);
    }
    const next: CartItem[] = [];
    for (const item of items) {
      const p = byId.get(item.productId);
      if (!p) continue;
      if (!p.is_active) continue;
      if (p.product_kind === "gift_card" || item.giftCard) {
        if (item.giftCard) {
          next.push({ ...item, productId: item.productId, quantity: 1 });
        }
        continue;
      }
      const productVariants = variantsByProduct.get(item.productId) ?? [];
      if (productVariants.length > 0) {
        // Varyantlı ürün: seçili ölçü hâlâ geçerli ve stoklu olmalı.
        if (!item.variantId) continue;
        const variant = variantById.get(item.variantId);
        if (!variant || variant.product_id !== item.productId) continue;
        const qty = variant.stock_quantity <= 0 ? 0 : Math.min(item.quantity, variant.stock_quantity);
        if (qty > 0) {
          next.push({ productId: item.productId, quantity: qty, variantId: variant.id, variantLabel: variant.label });
        }
        continue;
      }
      const stock = Math.max(0, Math.floor(Number(p.stock_quantity ?? 0)));
      const maxBuy = stock;
      const qty = maxBuy <= 0 ? 0 : Math.min(item.quantity, maxBuy);
      if (qty > 0) next.push({ productId: item.productId, quantity: qty, giftCard: item.giftCard });
    }
    const same =
      items.length === next.length &&
      items.every(
        (it, i) =>
          it.productId === next[i]?.productId &&
          it.quantity === next[i]?.quantity &&
          (it.variantId ?? "") === (next[i]?.variantId ?? ""),
      );
    if (!same) await setCartItems(next);
    return next;
  } catch {
    return items;
  }
}

export async function getDetailedCart() {
  const items = await reconcileCartCookie();
  if (items.length === 0) return { lines: [], subtotal: 0 };
  try {
    const supabase = await createClient();
    const ids = items.map((x) => x.productId);
    const { data } = await supabase
      .from("products")
      .select("*, product_images(*)")
      .in("id", ids)
      .eq("is_active", true);
    const byId = new Map((data ?? []).map((p) => [p.id, p as Product]));
    const variantsByProduct = await fetchVariantsForProducts(supabase, ids);
    const lines = items
      .map((item) => {
        const product = byId.get(item.productId);
        if (!product) return null;
        const variant = item.variantId
          ? (variantsByProduct.get(item.productId) ?? []).find((v) => v.id === item.variantId) ?? null
          : null;
        return {
          product,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity,
          giftCard: item.giftCard,
          variantId: item.variantId,
          variantLabel: item.variantLabel ?? variant?.label,
          variantStock: variant?.stock_quantity,
        };
      })
      .filter(Boolean) as {
        product: Product;
        quantity: number;
        lineTotal: number;
        giftCard?: GiftCardCartMeta;
        variantId?: string;
        variantLabel?: string;
        variantStock?: number;
      }[];
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    return { lines, subtotal };
  } catch {
    return { lines: [], subtotal: 0 };
  }
}
