import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductListingGrid } from "@/components/product/ProductListingGrid";
import { ListingPagination } from "@/components/product/ListingPagination";
import { ViewItemListTracker } from "@/components/analytics/ViewItemListTracker";
import { loadFavoriteUiContext } from "@/lib/account/favorite-context";
import {
  ERKEK_HUB_HREF,
  erkekCategoryHref,
  erkekCategoryLabel,
  isErkekCategorySlug,
  type ErkekCategorySlug,
} from "@/lib/products/audience";
import { getErkekPageData } from "@/lib/storefront";
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
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    koleksiyon?: string;
    sirala?: "newest" | "oldest" | "price_asc" | "price_desc" | "featured";
    min?: string;
    max?: string;
    sayfa?: string;
  }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  if (!isErkekCategorySlug(slug)) return { title: "Erkek" };
  const parsed = parseSayfaParam(sp.sayfa);
  if (parsed.kind === "invalid") notFound();
  const page = parsed.kind === "ok" ? parsed.page : 1;
  if (page > 1) {
    const data = await getErkekPageData(slug, {
      sort: sp.sirala ?? "newest",
      collection: sp.koleksiyon || undefined,
      min: sp.min ? Number(sp.min) : undefined,
      max: sp.max ? Number(sp.max) : undefined,
      page: 1,
      pageSize: LISTING_PAGE_SIZE,
    });
    if (!data || data.totalPages === 0 || page > data.totalPages) notFound();
  }
  const name = erkekCategoryLabel(slug);
  const path = erkekCategoryHref(slug);
  const lower = name.toLocaleLowerCase("tr-TR");
  const description = listingDescriptionWithPage(
    `Erkek ${lower} modelleri — paslanmaz çelik Zelula Design seçkisi. 650₺ üzeri ücretsiz kargo.`,
    page,
  );
  const title = listingTitleWithPage(`Erkek ${name}`, page);
  const noindex = listingHasNoindexFilters(sp);
  return {
    title,
    description,
    alternates: { canonical: listingCanonicalUrl(path, page) },
    ...(noindex ? { robots: FILTERED_LISTING_ROBOTS } : {}),
    openGraph: {
      title: `${title} | Zelula Design`,
      description,
      url: listingCanonicalUrl(path, page),
      type: "website",
      locale: "tr_TR",
      siteName: "Zelula Design",
    },
  };
}

export function generateStaticParams() {
  return (["bileklik", "yuzuk"] as ErkekCategorySlug[]).map((slug) => ({ slug }));
}

export default async function ErkekCategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!isErkekCategorySlug(slug)) notFound();

  const listPath = erkekCategoryHref(slug);
  const sp = await searchParams;
  const parsed = parseSayfaParam(sp.sayfa);
  if (parsed.kind === "redirect_page1") {
    const qs = new URLSearchParams();
    if (sp.koleksiyon) qs.set("koleksiyon", sp.koleksiyon);
    if (sp.sirala) qs.set("sirala", sp.sirala);
    if (sp.min) qs.set("min", sp.min);
    if (sp.max) qs.set("max", sp.max);
    const s = qs.toString();
    redirect(s ? `${listPath}?${s}` : listPath);
  }
  if (parsed.kind === "invalid") notFound();

  const page = parsed.page;
  const collectionSlug = sp.koleksiyon ?? "";
  const sort = sp.sirala ?? "newest";
  const min = sp.min ? Number(sp.min) : undefined;
  const max = sp.max ? Number(sp.max) : undefined;

  const data = await getErkekPageData(slug, {
    sort,
    collection: collectionSlug || undefined,
    min,
    max,
    page,
    pageSize: LISTING_PAGE_SIZE,
  });
  if (!data || data.mode !== "list") notFound();
  if (page > 1 && (data.totalPages === 0 || page > data.totalPages)) notFound();

  const { isSignedIn, favoriteIds } = await loadFavoriteUiContext();
  const hasActiveFilters = Boolean(collectionSlug || sp.sirala || sp.min || sp.max);
  const listingSp = {
    koleksiyon: collectionSlug || undefined,
    sirala: sp.sirala,
    min: sp.min,
    max: sp.max,
  };

  const trackerItems = data.products.map((p) => ({
    product_id: p.id,
    product_name: p.name,
    price: Number(p.price),
    quantity: 1,
    category: p.category?.name,
    collection: p.collection?.name ?? null,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <ViewItemListTracker listName={`Erkek: ${data.name}`} listId={`erkek_${slug}`} items={trackerItems} />

      <header className="max-w-2xl">
        <nav className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500">
          <Link href="/" className="transition hover:text-stone-800">
            Ana sayfa
          </Link>
          <span className="mx-2 text-stone-300">/</span>
          <Link href={ERKEK_HUB_HREF} className="transition hover:text-stone-800">
            Erkek
          </Link>
          <span className="mx-2 text-stone-300">/</span>
          <span className="text-stone-700">{data.name}</span>
        </nav>
        <h1 className="mt-4 font-serif text-3xl font-light tracking-tight text-stone-900 sm:text-4xl">
          Erkek {data.name}
          {page > 1 ? (
            <span className="ml-2 text-lg font-normal text-stone-500">· Sayfa {page}</span>
          ) : null}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Erkek {data.name.toLocaleLowerCase("tr-TR")} seçkisi.
        </p>
      </header>

      <section className="mt-12">
        <div className="mb-4 flex flex-col gap-4 sm:mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Ürünler
            <span className="ml-2 font-normal normal-case tracking-normal text-stone-400">
              ({data.totalCount})
            </span>
          </p>
          <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" action={listPath} method="get">
            <select
              name="koleksiyon"
              defaultValue={collectionSlug}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Tüm koleksiyonlar</option>
              {data.collections.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              name="sirala"
              defaultValue={sort}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="newest">En yeni</option>
              <option value="oldest">En eski</option>
              <option value="featured">Öne çıkan</option>
              <option value="price_asc">Fiyat artan</option>
              <option value="price_desc">Fiyat azalan</option>
            </select>
            <input
              name="min"
              type="number"
              defaultValue={sp.min ?? ""}
              placeholder="Min ₺"
              className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800 sm:col-span-2 lg:col-span-1"
            >
              Filtrele
            </button>
          </form>
        </div>
        {data.products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#e0d5c8] bg-[#faf8f5] px-6 py-12 text-center text-sm text-stone-600">
            {hasActiveFilters ? (
              <>Bu filtreye uygun ürün yok.</>
            ) : (
              <>
                Bu kategoride stokta erkek ürünü yok.{" "}
                <Link href={ERKEK_HUB_HREF} className="font-medium text-stone-800 underline-offset-2 hover:underline">
                  Tüm erkek ürünleri
                </Link>
                &apos;ne göz at.
              </>
            )}
          </p>
        ) : (
          <>
            <ProductListingGrid products={data.products} isSignedIn={isSignedIn} favoriteIds={favoriteIds} />
            <ListingPagination
              path={listPath}
              current={listingSp}
              page={data.page}
              totalPages={data.totalPages}
              totalCount={data.totalCount}
            />
          </>
        )}
      </section>
    </main>
  );
}
