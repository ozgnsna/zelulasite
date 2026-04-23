import Link from "next/link";
import { getDetailedCart } from "@/lib/cart";
import { CartDrawer } from "@/components/CartDrawer";

export async function Header() {
  const { lines } = await getDetailedCart();
  const count = lines.reduce((sum, x) => sum + x.quantity, 0);
  const drawerLines = lines.map((line) => ({
    productId: line.product.id,
    slug: line.product.slug,
    name: line.product.name,
    imageUrl: line.product.product_images?.[0]?.image_url ?? "https://picsum.photos/id/99/600/600",
    quantity: line.quantity,
    price: Number(line.product.price),
  }));

  return (
    <header className="sticky top-0 z-40 border-b border-[#e8dfd3] bg-[#fffdfb]/95 backdrop-blur-md">
      <div className="container-premium flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-serif text-xl tracking-tight text-stone-900">
          Zelula
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-stone-700 md:flex">
          <Link href="/koleksiyonlar" className="transition hover:text-stone-900">
            Koleksiyonlar
          </Link>
          <Link href="/urunler" className="transition hover:text-stone-900">
            Tüm Ürünler
          </Link>
          <Link href="/#yeni" className="transition hover:text-stone-900">
            Yeni Gelenler
          </Link>
        </nav>
        <nav className="flex items-center gap-3 text-sm text-stone-600">
          <CartDrawer count={count} lines={drawerLines} />
        </nav>
      </div>
    </header>
  );
}
