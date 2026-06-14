import type { Metadata } from "next";
import Link from "next/link";
import { ProductListingGrid } from "@/components/product/ProductListingGrid";
import { ViewItemListTracker } from "@/components/analytics/ViewItemListTracker";
import { loadFavoriteUiContext } from "@/lib/account/favorite-context";
import { getProducts } from "@/lib/storefront";

import { absoluteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Çok satanlar",
  description: "Zelula’da en çok tercih edilen öne çıkan parçalar.",
  alternates: { canonical: absoluteUrl("/cok-satanlar") },
};

export default async function BestSellersPage() {
  const { products } = await getProducts({ sort: "featured", featuredOnly: true });
  const { isSignedIn, favoriteIds } = await loadFavoriteUiContext();

  const trackerItems = products.map((p) => ({
    product_id: p.id,
    product_name: p.name,
    price: Number(p.price),
    quantity: 1,
    category: p.category?.name,
    collection: p.collection?.name ?? null,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <ViewItemListTracker listName="Çok Satanlar" listId="cok_satanlar" items={trackerItems} />

      <header className="max-w-2xl">
        <nav className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500">
          <Link href="/" className="transition hover:text-stone-800">
            Ana sayfa
          </Link>
          <span className="mx-2 text-stone-300">/</span>
          <span className="text-stone-700">Çok satanlar</span>
        </nav>
        <h1 className="mt-4 font-serif text-3xl font-light tracking-tight text-stone-900 sm:text-4xl">
          Çok satanlar
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Öne çıkan, en çok sevilen Zelula parçaları — hızlıca sepete ekle.
        </p>
      </header>

      <section className="mt-12">
        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#e0d5c8] bg-[#faf8f5] px-6 py-12 text-center text-sm text-stone-600">
            Şu an listelenecek öne çıkan ürün bulunmuyor.{" "}
            <Link href="/urunler" className="font-medium text-stone-800 underline-offset-2 hover:underline">
              Tüm ürünler
            </Link>
          </p>
        ) : (
          <ProductListingGrid products={products} isSignedIn={isSignedIn} favoriteIds={favoriteIds} />
        )}
      </section>
    </main>
  );
}
