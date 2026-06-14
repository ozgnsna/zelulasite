import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductListingGrid } from "@/components/product/ProductListingGrid";
import { ViewItemListTracker } from "@/components/analytics/ViewItemListTracker";
import { loadFavoriteUiContext } from "@/lib/account/favorite-context";
import { getCategoryPageData } from "@/lib/storefront";
import { categoryHref, isKnownCategorySlug } from "@/lib/categories/taxonomy";
import { absoluteUrl } from "@/lib/seo/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isKnownCategorySlug(slug)) return { title: "Kategori" };
  const data = await getCategoryPageData(slug);
  if (!data) return { title: "Kategori" };
  return {
    title: data.taxon.name,
    description: `${data.taxon.name} — Zelula seçkisinde ürünleri keşfedin.`,
    alternates: { canonical: absoluteUrl(`/kategori/${slug}`) },
    openGraph: {
      title: `${data.taxon.name} | Zelula Design`,
      description: `${data.taxon.name} — Zelula seçkisinde ürünleri keşfedin.`,
      url: absoluteUrl(`/kategori/${slug}`),
      type: "website",
      locale: "tr_TR",
      siteName: "Zelula Design",
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  if (!isKnownCategorySlug(slug)) notFound();

  const data = await getCategoryPageData(slug);
  if (!data) notFound();

  const { isSignedIn, favoriteIds } = await loadFavoriteUiContext();

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
      <ViewItemListTracker
        listName={`Kategori: ${data.taxon.name}`}
        listId={`category_${slug}`}
        items={trackerItems}
      />

      <header className="max-w-2xl">
        <nav className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500">
          <Link href="/" className="transition hover:text-stone-800">
            Ana sayfa
          </Link>
          <span className="mx-2 text-stone-300">/</span>
          <span className="text-stone-700">{data.taxon.name}</span>
        </nav>
        <h1 className="mt-4 font-serif text-3xl font-light tracking-tight text-stone-900 sm:text-4xl">
          {data.taxon.name}
        </h1>
        {data.mode === "list" && data.listCaption ? (
          <p className="mt-3 text-sm leading-relaxed text-stone-600">{data.listCaption}</p>
        ) : data.mode === "hub" ? (
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Alt kategorilere geç veya aşağıdaki tüm ürünleri incele.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Bu kategorideki ürünleri keşfet.
          </p>
        )}
      </header>

      {data.mode === "hub" ? (
        <section className="mt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Alt kategoriler</p>
          <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {data.children.map((c) => (
              <li key={c.slug}>
                <Link
                  href={categoryHref(c.slug)}
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
      ) : null}

      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            {data.mode === "hub" ? "Tüm ürünler" : "Ürünler"}
            <span className="ml-2 font-normal normal-case tracking-normal text-stone-400">
              ({data.products.length})
            </span>
          </p>
          <Link
            href="/urunler"
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500 underline-offset-4 transition hover:text-stone-800 hover:underline"
          >
            Gelişmiş filtre
          </Link>
        </div>
        {data.products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#e0d5c8] bg-[#faf8f5] px-6 py-12 text-center text-sm text-stone-600">
            Bu kategoride henüz ürün yok.{" "}
            <Link href="/urunler" className="font-medium text-stone-800 underline-offset-2 hover:underline">
              Tüm ürünler
            </Link>
            &apos;e göz at.
          </p>
        ) : (
          <ProductListingGrid products={data.products} isSignedIn={isSignedIn} favoriteIds={favoriteIds} />
        )}
      </section>
    </main>
  );
}
