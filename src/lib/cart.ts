import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { CartItem, Product } from "@/lib/types";

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
    const { data, error } = await supabase.from("products").select("id,stock_quantity,is_active").in("id", ids);
    if (error || !data) return items;
    const byId = new Map(data.map((r) => [r.id, r as { id: string; stock_quantity: number | null; is_active: boolean | null }]));
    const next: CartItem[] = [];
    for (const item of items) {
      const p = byId.get(item.productId);
      if (!p) continue;
      const stock = Math.max(0, Math.floor(Number(p.stock_quantity ?? 0)));
      const maxBuy = p.is_active ? stock : 0;
      const qty = maxBuy <= 0 ? 0 : Math.min(item.quantity, maxBuy);
      if (qty > 0) next.push({ productId: item.productId, quantity: qty });
    }
    const same =
      items.length === next.length && items.every((it, i) => it.productId === next[i]?.productId && it.quantity === next[i]?.quantity);
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
    const lines = items
      .map((item) => {
        const product = byId.get(item.productId);
        if (!product) return null;
        return { product, quantity: item.quantity, lineTotal: product.price * item.quantity };
      })
      .filter(Boolean) as { product: Product; quantity: number; lineTotal: number }[];
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    return { lines, subtotal };
  } catch {
    return { lines: [], subtotal: 0 };
  }
}
