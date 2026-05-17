import { getDetailedCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/server";
import { CartDrawer } from "@/components/CartDrawer";
import { getCartUpsellProducts } from "@/lib/storefront";
import { HeaderShell } from "@/components/header/HeaderShell";

/** Logo: `public/zelula-logo-header.svg` — transparent header mark. */

function greetingFirstNameFromProfile(fullName: string | null | undefined): string | null {
  const t = (fullName ?? "").trim();
  if (!t) return null;
  const first = t.split(/\s+/).filter(Boolean)[0];
  return first ?? null;
}

export async function Header() {
  try {
    const supabase = await createClient();
    const [{ data: { user } }, { lines }] = await Promise.all([
      supabase.auth.getUser(),
      getDetailedCart(),
    ]);

    let greetingFirstName: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      greetingFirstName = greetingFirstNameFromProfile(profile?.full_name);
    }
    const count = lines.reduce((sum, x) => sum + x.quantity, 0);
    const drawerLines = lines.map((line) => ({
      productId: line.product.id,
      slug: line.product.slug,
      name: line.product.name,
      imageUrl: line.product.product_images?.[0]?.image_url ?? "https://picsum.photos/id/99/600/600",
      quantity: line.quantity,
      price: Number(line.product.price),
    }));
    const upsellProducts =
      lines.length === 0
        ? []
        : await getCartUpsellProducts(
            lines.map((line) => ({
              id: line.product.id,
              name: line.product.name,
              categoryName: line.product.category?.name,
              collectionId: line.product.collection?.id ?? null,
              material: line.product.material,
              color: line.product.color,
              price: Number(line.product.price),
            })),
            3,
          );
    const drawerUpsellItems = upsellProducts.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: Number(p.price),
      imageUrl: p.product_images?.[0]?.image_url ?? "https://picsum.photos/id/90/900/900",
      stock: p.stock_quantity,
    }));

    return (
      <header className="sticky top-0 z-40 border-b border-[#e8e2d9]/90 bg-[#fffdfb] shadow-[0_1px_0_rgba(255,255,255,0.65)]">
        <HeaderShell
          isLoggedIn={Boolean(user)}
          greetingFirstName={greetingFirstName}
          cartSlot={<CartDrawer count={count} lines={drawerLines} upsellItems={drawerUpsellItems} />}
        />
      </header>
    );
  } catch {
    return (
      <header className="sticky top-0 z-40 border-b border-[#e8e2d9]/90 bg-[#fffdfb] shadow-[0_1px_0_rgba(255,255,255,0.65)]">
        <HeaderShell
          isLoggedIn={false}
          greetingFirstName={null}
          cartSlot={<CartDrawer count={0} lines={[]} upsellItems={[]} />}
        />
      </header>
    );
  }
}
