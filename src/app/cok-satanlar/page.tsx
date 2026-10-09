import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductListingGrid } from "@/components/product/ProductListingGrid";
import { ListingIntro, ListingSeoBody } from "@/components/product/ListingSeoCopy";
import { ListingPagination } from "@/components/product/ListingPagination";
import { ViewItemListTracker } from "@/components/analytics/ViewItemListTracker";
import { loadFavoriteUiContext } from "@/lib/account/favorite-context";
import { getBestsellersListingMeta, getProducts } from "@/lib/storefront";
import {
  LISTING_PAGE_SIZE,
  buildSliceListingMetadata,
  parseSayfaParam,
  totalPagesFor,
} from "@/lib/storefront/listing-pagination";

type Props = {
  searchParams: Promise<{ sayfa?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const parsed = parseSayfaParam(sp.sayfa);
  if (parsed.kind === "invalid") notFound();
  const page = parsed.kind === "ok" ? parsed.page : 1;
  const meta = await getBestsellersListingMeta();
  const totalPages = totalPagesFor(meta.filteredCount, LISTING_PAGE_SIZE);
  if (page > 1 && (totalPages === 0 || page > totalPages)) notFound();
  return buildSliceListingMetadata({
    titleSegment: meta.titleSegment,
    description: meta.description,
    path: "/cok-satanlar",
    page,
    noindex: meta.inStockCount === 0,
  });
}

export default async function BestSellersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const parsed = parseSayfaParam(sp.sayfa);
  if (parsed.kind === "redirect_page1") redirect("/cok-satanlar");
  if (parsed.kind === "invalid") notFound();

  const page = parsed.page;
  const metaCopy = await getBestsellersListingMeta();
  const { products, totalCount, totalPages } = await getProducts({
    sort: "featured",
    featuredOnly: true,
    page,
    pageSize: LISTING_PAGE_SIZE,
  });
  if (page > 1 && (totalPages === 0 || page > totalPages)) notFound();

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
          {page > 1 ? (
            <span className="ml-2 text-lg font-normal text-stone-500">· Sayfa {page}</span>
          ) : null}
        </h1>
        <ListingIntro text={metaCopy.intro}>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Öne çıkan, en çok sevilen Zelula parçaları — hızlıca sepete ekle.
          </p>
        </ListingIntro>
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
          <>
            <ProductListingGrid products={products} isSignedIn={isSignedIn} favoriteIds={favoriteIds} />
            <ListingPagination
              path="/cok-satanlar"
              current={{}}
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
            />
          </>
        )}
      </section>
      <ListingSeoBody text={metaCopy.body} />
    </main>
  );
}
