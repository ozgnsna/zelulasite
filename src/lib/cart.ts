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

export async function getDetailedCart() {
  const items = await getCartItems();
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
