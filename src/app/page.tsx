import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { loadFavoriteUiContext } from "@/lib/account/favorite-context";
import { getHomeData, getProductPageHrefByName } from "@/lib/storefront";
import { pickProductCoverImageUrl } from "@/lib/products/cover-image";
import { ViewItemListTracker } from "@/components/analytics/ViewItemListTracker";
import { FadeIn } from "@/components/home/FadeIn";
import { HomeHeroBannerCarousel } from "@/components/home/HomeHeroBannerCarousel";
import { HomeNewsletter } from "@/components/home/HomeNewsletter";
import { HomeCategoryGrid } from "@/components/home/HomeCategoryGrid";
import { HomeWhyZelula } from "@/components/home/HomeWhyZelula";
import { HomeSocialProof } from "@/components/home/HomeSocialProof";
import { HomeProductRail, HomeProductRailItem } from "@/components/home/HomeProductRail";
import { Suspense } from "react";
import {
  HomeInstagramSection,
  HomeInstagramSectionSkeleton,
} from "@/components/home/HomeInstagramSection";

type HeroBannerDef = {
  id: string;
  imageSrc: string;
  alt: string;
  href: string;
  objectPosition?: string;
  productName?: string;
};

const HERO_BANNER_DEFS: HeroBannerDef[] = [
  {
    id: "baligin-isiltisi",
    imageSrc: "/hero-banner-baligin-isiltisi.png",
    alt: "Zelula — Balığın Işıltısı; Zelula Artisan Fish Küpe",
    href: "/urunler/zelula-artisan-fish-kupe",
    objectPosition: "left center",
  },
  {
    id: "gold",
    imageSrc: "/hero-banner-gold.png",
    alt: "Zelula — Taktığınızda fark edilen detaylar; plaj ve inci kolye koleksiyonu",
    href: "/urunler",
    objectPosition: "left center",
  },
  {
    id: "pearl",
    imageSrc: "/hero-banner-pearl.png",
    alt: "Zelula — Taktığınızda fark edilen detaylar; altın takı koleksiyonu",
    href: "/urunler",
    objectPosition: "left center",
  },
  {
    id: "collection",
    imageSrc: "/hero-banner-collection.png",
    alt: "Zelula Kids — Hayal gücü kadar renkli; çocuk kolye koleksiyonu",
    href: "/urunler",
    objectPosition: "left center",
  },
];

async function buildHeroBanners() {
  const productNames = [...new Set(HERO_BANNER_DEFS.map((b) => b.productName).filter(Boolean))] as string[];
  const hrefByName = new Map<string, string>();
  await Promise.all(
    productNames.map(async (name) => {
      const href = await getProductPageHrefByName(name);
      if (href) hrefByName.set(name, href);
    }),
  );

  return HERO_BANNER_DEFS.map(({ productName, ...banner }) => ({
    ...banner,
    href: productName ? hrefByName.get(productName) ?? banner.href : banner.href,
  }));
}

export default async function HomePage() {
  const [{ categories, bestSellers, newArrivals }, { isSignedIn, favoriteIds }, heroBanners] =
    await Promise.all([getHomeData(), loadFavoriteUiContext(), buildHeroBanners()]);

  const bestSellerItems = bestSellers.map((p) => ({
    product_id: p.id,
    product_name: p.name,
    price: Number(p.price),
    quantity: 1,
    category: p.category?.name,
    collection: p.collection?.name ?? null,
  }));
  const newArrivalItems = newArrivals.map((p) => ({
    product_id: p.id,
    product_name: p.name,
    price: Number(p.price),
    quantity: 1,
    category: p.category?.name,
    collection: p.collection?.name ?? null,
  }));

  const bestSlice = bestSellers.slice(0, 4);
  const kombinSlice = newArrivals.slice(0, 4);
  const categoryDefaults = [
    {
      slug: "kolye",
      label: "Kolye",
      href: "/kategori/kolye",
      fallbackImage: "https://images.pexels.com/photos/1454173/pexels-photo-1454173.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      slug: "kupe",
      label: "Küpe",
      href: "/kategori/kupe",
      fallbackImage: "https://images.pexels.com/photos/5370707/pexels-photo-5370707.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      slug: "bileklik",
      label: "Bileklik",
      href: "/kategori/bileklik",
      fallbackImage: "https://images.pexels.com/photos/5370704/pexels-photo-5370704.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      slug: "yuzuk",
      label: "Yüzük",
      href: "/kategori/yuzuk",
      fallbackImage: "https://images.pexels.com/photos/5370706/pexels-photo-5370706.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
  ] as const;
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const categoryCards = categoryDefaults.map((cfg) => {
    const dbRow = categoryBySlug.get(cfg.slug);
    const imageFromDb = String(dbRow?.image_url ?? "").trim();
    return {
      label: dbRow?.name ?? cfg.label,
      href: cfg.href,
      image: imageFromDb || cfg.fallbackImage,
    };
  });

  return (
    <main className="bg-[#faf8f5] pb-20">
      <ViewItemListTracker listName="Homepage Best Sellers" listId="home_best_sellers" items={bestSellerItems} />
      <ViewItemListTracker listName="Homepage New Arrivals" listId="home_new_arrivals" items={newArrivalItems} />

      <HomeHeroBannerCarousel banners={heroBanners} />

      <FadeIn delay={0.02}>
        <section className="border-t border-[#ebe6df] bg-[#fffdfb] py-14 sm:py-16">
          <div className="container-premium">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-stone-500">Öne çıkan</p>
                <h2 className="mt-2 font-serif text-2xl font-light tracking-tight text-stone-900 sm:text-3xl">
                  Çok satanlar
                </h2>
              </div>
              <Link
                href="/cok-satanlar"
                className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500 underline-offset-4 transition hover:text-stone-800 hover:underline"
              >
                Tümünü gör
              </Link>
            </div>
            <HomeProductRail className="mt-10">
              {bestSlice.map((p) => (
                <HomeProductRailItem key={p.id}>
                  <ProductCard
                    id={p.id}
                    slug={p.slug}
                    name={p.name}
                    imageUrl={pickProductCoverImageUrl(p.product_images, "https://picsum.photos/id/99/900/900")}
                    price={Number(p.price)}
                    compareAtPrice={p.compare_at_price ? Number(p.compare_at_price) : null}
                    category={p.category?.name}
                    collection={p.collection?.name ?? null}
                    imageForward
                    imageEmphasis="high"
                    conversionOverlay
                    badges={{ bestseller: true, new: p.new_arrival }}
                    isSignedIn={isSignedIn}
                    initialFavorited={favoriteIds.has(p.id)}
                  />
                </HomeProductRailItem>
              ))}
            </HomeProductRail>
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.03}>
        <section className="container-premium py-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-stone-500">Alışverişe başla</p>
            <h2 className="mt-3 font-serif text-2xl font-light tracking-tight text-stone-900 sm:text-3xl">
              Kategoriler
            </h2>
            <p className="mt-2 text-sm font-light text-stone-600">İhtiyacın olan parçayı tek dokunuşla seç.</p>
          </div>
          <div className="mt-10">
            <HomeCategoryGrid items={categoryCards} />
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.04}>
        <section className="border-t border-[#ebe6df] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] py-14 sm:py-16">
          <div className="container-premium mx-auto max-w-2xl text-center">
            <p className="font-serif text-lg font-light leading-relaxed text-stone-800 sm:text-xl">
              Zelula, sadece bir takı değil; bir hissin yansımasıdır.
            </p>
            <Link
              href="/urunler"
              className="mt-6 inline-flex text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--brand-gold)] underline-offset-[6px] transition hover:text-stone-800 hover:underline"
            >
              Ürünleri keşfet
            </Link>
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.05}>
        <section className="container-premium py-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-stone-500">Stil</p>
            <h2 className="mt-3 font-serif text-2xl font-light tracking-tight text-stone-900 sm:text-3xl">
              Kombinini tamamla
            </h2>
            <p className="mt-2 text-sm font-light text-stone-600">Günlük ve özel anlara uyumlu seçkiler.</p>
          </div>
          <HomeProductRail className="mt-10">
            {kombinSlice.map((p) => (
              <HomeProductRailItem key={p.id}>
                <div className="h-full transition-[transform,box-shadow] duration-200 ease-out motion-safe:hover:scale-[1.02] motion-safe:hover:shadow-[0_20px_48px_rgba(55,48,40,0.12)]">
                  <ProductCard
                    id={p.id}
                    slug={p.slug}
                    name={p.name}
                    imageUrl={pickProductCoverImageUrl(p.product_images, "https://picsum.photos/id/90/900/900")}
                    price={Number(p.price)}
                    compareAtPrice={p.compare_at_price ? Number(p.compare_at_price) : null}
                    category={p.category?.name}
                    collection={p.collection?.name ?? null}
                    imageForward
                    imageEmphasis="high"
                    conversionOverlay
                    badges={{ bestseller: p.featured, new: true }}
                    className="h-full border-[#e8e2d9] shadow-[0_12px_36px_rgba(55,48,40,0.08)]"
                    isSignedIn={isSignedIn}
                    initialFavorited={favoriteIds.has(p.id)}
                  />
                </div>
              </HomeProductRailItem>
            ))}
          </HomeProductRail>
        </section>
      </FadeIn>

      <HomeWhyZelula />

      <FadeIn delay={0.02}>
        <HomeSocialProof />
      </FadeIn>

      <FadeIn delay={0.03}>
        <section className="container-premium py-12 sm:py-16">
          <div className="rounded-[2rem] border border-[#e8e3da] bg-[#fdfcfa] px-6 py-10 text-center shadow-[0_20px_48px_rgba(55,48,40,0.06)] sm:px-12 sm:py-14">
            <h2 className="font-serif text-xl font-light text-stone-900 sm:text-2xl">Hazır mısın?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-light text-stone-600">
              Seçtiğin parça bir tık uzağında; güvenli ödeme ile hemen tamamla.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/urunler"
                className="inline-flex min-h-[2.85rem] min-w-[12rem] items-center justify-center rounded-full bg-stone-900 px-8 text-[12px] font-medium uppercase tracking-[0.18em] text-[#fdfbf7] shadow-[0_14px_36px_rgba(28,24,20,0.2)] transition hover:bg-[#2a2420]"
              >
                Şimdi alışverişe başla
              </Link>
              <Link
                href="/cok-satanlar"
                className="inline-flex min-h-[2.85rem] min-w-[12rem] items-center justify-center rounded-full border border-[#e0d5c8] bg-white px-8 text-[12px] font-medium uppercase tracking-[0.16em] text-stone-800 transition hover:border-[color:var(--brand-gold)]/45"
              >
                Çok satanlar
              </Link>
            </div>
          </div>
        </section>
      </FadeIn>

      <Suspense fallback={<HomeInstagramSectionSkeleton />}>
        <HomeInstagramSection />
      </Suspense>

      <FadeIn delay={0.05}>
        <HomeNewsletter />
      </FadeIn>
    </main>
  );
}
