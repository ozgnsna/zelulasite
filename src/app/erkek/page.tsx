import type { Metadata } from "next";
import Link from "next/link";
import { ProductListingGrid } from "@/components/product/ProductListingGrid";
import { ViewItemListTracker } from "@/components/analytics/ViewItemListTracker";
import { loadFavoriteUiContext } from "@/lib/account/favorite-context";
import { ERKEK_HUB_HREF, erkekCategoryHref } from "@/lib/products/audience";
import { getErkekPageData } from "@/lib/storefront";
import { absoluteUrl } from "@/lib/seo/site";

type Props = {
  searchParams: Promise<{
    koleksiyon?: string;
    sirala?: "newest" | "oldest" | "price_asc" | "price_desc" | "featured";
    min?: string;
    max?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Erkek",
  description: "Erkek bileklik ve yüzük koleksiyonu — Zelula Design.",
  alternates: { canonical: absoluteUrl(ERKEK_HUB_HREF) },
  openGraph: {
    title: "Erkek | Zelula Design",
    description: "Erkek bileklik ve yüzük koleksiyonu.",
    url: absoluteUrl(ERKEK_HUB_HREF),
    type: "website",
    locale: "tr_TR",
    siteName: "Zelula Design",
  },
};

export default async function ErkekHubPage({ searchParams }: Props) {
  const sp = await searchParams;
  const collectionSlug = sp.koleksiyon ?? "";
  const sort = sp.sirala ?? "newest";
  const min = sp.min ? Number(sp.min) : undefined;
  const max = sp.max ? Number(sp.max) : undefined;

  const data = await getErkekPageData(undefined, {
    sort,
    collection: collectionSlug || undefined,
    min,
    max,
  });
  if (!data || data.mode !== "hub") return null;

  const { isSignedIn, favoriteIds } = await loadFavoriteUiContext();
  const hasActiveFilters = Boolean(collectionSlug || sp.sirala || sp.min || sp.max);

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
      <ViewItemListTracker listName="Erkek" listId="erkek_hub" items={trackerItems} />

      <header className="max-w-2xl">
        <nav className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500">
          <Link href="/" className="transition hover:text-stone-800">
            Ana sayfa
          </Link>
          <span className="mx-2 text-stone-300">/</span>
          <span className="text-stone-700">Erkek</span>
        </nav>
        <h1 className="mt-4 font-serif text-3xl font-light tracking-tight text-stone-900 sm:text-4xl">Erkek</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Bileklik ve yüzük seçkisi. İleride saat ve gözlük de bu bölüme eklenecek.
        </p>
      </header>

      <section className="mt-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Kategoriler</p>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
          {data.children.map((c) => (
            <li key={c.slug}>
              <Link
                href={erkekCategoryHref(c.slug)}
                className="flex items-center justify-between rounded-2xl border border-[#e8e2d9] bg-[#fffdfb] px-3 py-3 text-sm font-medium text-stone-800 shadow-sm transition hover:border-[color:var(--brand-gold)]/35 hover:shadow-md sm:px-4 sm:py-3.5"
              >
                {c.name}
                <span className="text-stone-400" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex flex-col gap-4 sm:mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Tüm erkek ürünleri
            <span className="ml-2 font-normal normal-case tracking-normal text-stone-400">({data.products.length})</span>
          </p>
          <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" action={ERKEK_HUB_HREF} method="get">
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
              <>Bu filtreye uygun erkek ürünü yok.</>
            ) : (
              <>Şu an stokta erkek ürünü yok. Yakında yeni parçalar eklenecek.</>
            )}
          </p>
        ) : (
          <ProductListingGrid products={data.products} isSignedIn={isSignedIn} favoriteIds={favoriteIds} />
        )}
      </section>
    </main>
  );
}
