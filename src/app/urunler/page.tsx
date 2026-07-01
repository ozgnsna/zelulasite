import type { Metadata } from "next";
import { ProductListingGrid } from "@/components/product/ProductListingGrid";
import { loadFavoriteUiContext } from "@/lib/account/favorite-context";
import { getProducts } from "@/lib/storefront";
import { ViewItemListTracker } from "@/components/analytics/ViewItemListTracker";
import { SearchUsageTracker } from "@/components/analytics/SearchUsageTracker";
import { CategoryClickLink } from "@/components/analytics/CategoryClickLink";
import { categoryHref, isKnownCategorySlug } from "@/lib/categories/taxonomy";
import { absoluteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Tüm ürünler",
  description: "Zelula Design takı ve aksesuar seçkisini keşfedin.",
  alternates: { canonical: absoluteUrl("/urunler") },
};

type Props = {
  searchParams: Promise<{
    q?: string;
    kategori?: string;
    koleksiyon?: string;
    sirala?: "newest" | "oldest" | "price_asc" | "price_desc" | "featured";
    min?: string;
    max?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const categorySlug = sp.kategori ?? "";
  const collectionSlug = sp.koleksiyon ?? "";
  const searchQuery = (sp.q ?? "").trim();
  const sort = sp.sirala ?? "newest";
  const min = sp.min ? Number(sp.min) : undefined;
  const max = sp.max ? Number(sp.max) : undefined;
  const { categories, collections, products } = await getProducts({
    category: categorySlug,
    collection: collectionSlug,
    sort,
    min,
    max,
    q: searchQuery,
  });
  const { isSignedIn, favoriteIds } = await loadFavoriteUiContext();
  const activeCategoryName = categorySlug
    ? categories.find((c) => c.slug === categorySlug)?.name
    : undefined;
  const pageTitle = searchQuery
    ? `“${searchQuery}” için sonuçlar`
    : activeCategoryName ?? "Tüm ürünler";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <SearchUsageTracker
        location="products_page"
        query={sp.q ?? ""}
        resultsCount={products.length}
        filters={{
          kategori: categorySlug || null,
          koleksiyon: collectionSlug || null,
          sirala: sort,
          min: min ?? null,
          max: max ?? null,
        }}
      />
      <ViewItemListTracker
        listName="Urunler Listeleme"
        listId="products_listing"
        items={products.map((p) => ({
          product_id: p.id,
          product_name: p.name,
          price: Number(p.price),
          quantity: 1,
          category: p.category?.name,
          collection: p.collection?.name ?? null,
        }))}
      />
      <header className="max-w-2xl">
        <h1 className="font-serif text-3xl font-medium text-stone-900 sm:text-4xl">
          {pageTitle}
        </h1>
        <p className="mt-3 text-stone-600">
          {searchQuery
            ? `${products.length} ürün bulundu. Kategori ve filtrelerle daraltabilirsiniz.`
            : "Kategori ve arama ile daraltın. Her ürün için özet, detay ve sepet akışı aynı yerde."}
        </p>
      </header>

      <form className="mt-6 flex w-full max-w-2xl items-center gap-2" action="/urunler" method="get">
        {categorySlug ? <input type="hidden" name="kategori" value={categorySlug} /> : null}
        {collectionSlug ? <input type="hidden" name="koleksiyon" value={collectionSlug} /> : null}
        <div className="min-w-0 flex-1">
          <input
            type="search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Ürün, materyal veya renk ara…"
            aria-label="Ürün ara"
            className="w-full rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none focus:border-stone-400"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
        >
          Ara
        </button>
      </form>

      <div className="mt-10 flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Kategori</p>
          <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap">
            <li>
              <CategoryClickLink
                href="/urunler"
                category="Tum Kategoriler"
                location="products_sidebar"
                className={`block rounded-full px-3 py-1.5 text-sm transition ${
                  !categorySlug
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                Tümü
              </CategoryClickLink>
            </li>
            {categories.map((c) => {
              const href = isKnownCategorySlug(c.slug)
                ? categoryHref(c.slug)
                : `/urunler?kategori=${c.slug}${collectionSlug ? `&koleksiyon=${collectionSlug}` : ""}`;
              return (
                <li key={c.id}>
                  <CategoryClickLink
                    href={href}
                    category={c.name}
                    location="products_sidebar"
                    className={`block rounded-full px-3 py-1.5 text-sm transition ${
                      categorySlug === c.slug
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {c.name}
                  </CategoryClickLink>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="min-w-0 flex-1">
          <form className="mb-8 grid gap-2 sm:grid-cols-4" action="/urunler" method="get">
            <input type="hidden" name="kategori" value={categorySlug} />
            {searchQuery ? <input type="hidden" name="q" value={searchQuery} /> : null}
            <select name="koleksiyon" defaultValue={collectionSlug} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm">
              <option value="">Tüm koleksiyonlar</option>
              {collections.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <select name="sirala" defaultValue={sort} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm">
              <option value="newest">En yeni</option>
              <option value="oldest">En eski</option>
              <option value="featured">Öne çıkan</option>
              <option value="price_asc">Fiyat artan</option>
              <option value="price_desc">Fiyat azalan</option>
            </select>
            <input name="min" type="number" placeholder="Min ₺" className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm" />
            <button type="submit" className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800">
              Filtrele
            </button>
          </form>

          {products.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center text-stone-600">
              Bu filtreye uygun ürün yok. Filtreleri temizleyip tekrar deneyin.
            </p>
          ) : (
            <ProductListingGrid
              products={products}
              isSignedIn={isSignedIn}
              favoriteIds={favoriteIds}
              conversionOverlay
              fallbackImage="https://picsum.photos/id/90/900/900"
            />
          )}
        </div>
      </div>
    </main>
  );
}
