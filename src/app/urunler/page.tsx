import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProductListingGrid } from "@/components/product/ProductListingGrid";
import { ListingPagination } from "@/components/product/ListingPagination";
import { loadFavoriteUiContext } from "@/lib/account/favorite-context";
import { getProducts } from "@/lib/storefront";
import { ViewItemListTracker } from "@/components/analytics/ViewItemListTracker";
import { SearchUsageTracker } from "@/components/analytics/SearchUsageTracker";
import { CategoryClickLink } from "@/components/analytics/CategoryClickLink";
import { categoryHref, isKnownCategorySlug } from "@/lib/categories/taxonomy";
import {
  FILTERED_LISTING_ROBOTS,
  LISTING_PAGE_SIZE,
  listingCanonicalUrl,
  listingDescriptionWithPage,
  listingHasNoindexFilters,
  listingTitleWithPage,
  parseSayfaParam,
} from "@/lib/storefront/listing-pagination";

type Props = {
  searchParams: Promise<{
    q?: string;
    kategori?: string;
    koleksiyon?: string;
    sirala?: "newest" | "oldest" | "price_asc" | "price_desc" | "featured";
    min?: string;
    max?: string;
    sayfa?: string;
  }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const parsed = parseSayfaParam(sp.sayfa);
  if (parsed.kind === "invalid") notFound();
  const page = parsed.kind === "ok" ? parsed.page : 1;
  if (page > 1) {
    const { totalPages } = await getProducts({
      category: sp.kategori,
      collection: sp.koleksiyon,
      sort: sp.sirala ?? "newest",
      min: sp.min ? Number(sp.min) : undefined,
      max: sp.max ? Number(sp.max) : undefined,
      q: sp.q,
      page: 1,
      pageSize: LISTING_PAGE_SIZE,
    });
    if (totalPages === 0 || page > totalPages) notFound();
  }
  const baseTitle = "Tüm ürünler";
  const baseDescription = "Zelula Design takı ve aksesuar seçkisini keşfedin.";
  const noindex = listingHasNoindexFilters(sp);
  return {
    title: listingTitleWithPage(baseTitle, page),
    description: listingDescriptionWithPage(baseDescription, page),
    alternates: { canonical: listingCanonicalUrl("/urunler", page) },
    ...(noindex ? { robots: FILTERED_LISTING_ROBOTS } : {}),
  };
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const parsed = parseSayfaParam(sp.sayfa);
  if (parsed.kind === "redirect_page1") {
    const qs = new URLSearchParams();
    if (sp.q?.trim()) qs.set("q", sp.q.trim());
    if (sp.kategori) qs.set("kategori", sp.kategori);
    if (sp.koleksiyon) qs.set("koleksiyon", sp.koleksiyon);
    if (sp.sirala) qs.set("sirala", sp.sirala);
    if (sp.min) qs.set("min", sp.min);
    if (sp.max) qs.set("max", sp.max);
    const s = qs.toString();
    redirect(s ? `/urunler?${s}` : "/urunler");
  }
  if (parsed.kind === "invalid") notFound();

  const page = parsed.page;
  const categorySlug = sp.kategori ?? "";
  const collectionSlug = sp.koleksiyon ?? "";
  const searchQuery = (sp.q ?? "").trim();
  const sort = sp.sirala ?? "newest";
  const min = sp.min ? Number(sp.min) : undefined;
  const max = sp.max ? Number(sp.max) : undefined;

  const { categories, collections, products, totalCount, totalPages } = await getProducts({
    category: categorySlug,
    collection: collectionSlug,
    sort,
    min,
    max,
    q: searchQuery,
    page,
    pageSize: LISTING_PAGE_SIZE,
  });

  if (page > 1 && (totalPages === 0 || page > totalPages)) notFound();

  const { isSignedIn, favoriteIds } = await loadFavoriteUiContext();
  const activeCategoryName = categorySlug
    ? categories.find((c) => c.slug === categorySlug)?.name
    : undefined;
  const pageTitle = searchQuery
    ? `“${searchQuery}” için sonuçlar`
    : activeCategoryName ?? "Tüm ürünler";

  const listingSp = {
    q: searchQuery || undefined,
    kategori: categorySlug || undefined,
    koleksiyon: collectionSlug || undefined,
    sirala: sp.sirala,
    min: sp.min,
    max: sp.max,
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <SearchUsageTracker
        location="products_page"
        query={sp.q ?? ""}
        resultsCount={totalCount}
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
          {page > 1 ? (
            <span className="ml-2 text-lg font-normal text-stone-500">· Sayfa {page}</span>
          ) : null}
        </h1>
        <p className="mt-3 text-stone-600">
          {searchQuery
            ? `${totalCount} ürün bulundu. Kategori ve filtrelerle daraltabilirsiniz.`
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
            <>
              <ProductListingGrid
                products={products}
                isSignedIn={isSignedIn}
                favoriteIds={favoriteIds}
                conversionOverlay
                fallbackImage="https://picsum.photos/id/90/900/900"
              />
              <ListingPagination
                path="/urunler"
                current={listingSp}
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
