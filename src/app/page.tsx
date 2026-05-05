import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/ProductCard";
import { loadFavoriteUiContext } from "@/lib/account/favorite-context";
import { getHomeData } from "@/lib/storefront";
import { ViewItemListTracker } from "@/components/analytics/ViewItemListTracker";
import { FadeIn } from "@/components/home/FadeIn";
import { HomeHero } from "@/components/home/HomeHero";
import { CinematicLinkCard } from "@/components/home/CinematicLinkCard";
import { HomeNewsletter } from "@/components/home/HomeNewsletter";
import { HomeCategoryGrid } from "@/components/home/HomeCategoryGrid";
import { HomeWhyZelula } from "@/components/home/HomeWhyZelula";
import { HomeSocialProof } from "@/components/home/HomeSocialProof";
import { HomeProductRail, HomeProductRailItem } from "@/components/home/HomeProductRail";
import { getInstagramFeed } from "@/lib/instagram";

const HERO_IMAGE = "/hero-luxury.png";

const instagramProfileHref = `https://www.instagram.com/${process.env.INSTAGRAM_USERNAME ?? "zelulaofficial"}`;

export default async function HomePage() {
  const { collections, bestSellers, newArrivals } = await getHomeData();
  const { isSignedIn, favoriteIds } = await loadFavoriteUiContext();
  const instagramPosts = await getInstagramFeed(4);
  const heroVideoUrl = process.env.NEXT_PUBLIC_HERO_VIDEO_URL?.trim() || null;

  const collectionHeroImage: Record<string, string> = {
    aura: "https://images.pexels.com/photos/9428777/pexels-photo-9428777.jpeg?auto=compress&cs=tinysrgb&w=1200",
    noir: "https://images.pexels.com/photos/1454172/pexels-photo-1454172.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "daily-glow":
      "https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=1200",
  };
  const collectionFallbackImage =
    "https://images.pexels.com/photos/10983783/pexels-photo-10983783.jpeg?auto=compress&cs=tinysrgb&w=1200";

  const collectionPreview = collections.slice(0, 4);

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
  const categoryCards = [
    {
      label: "Kolye",
      href: "/kategori/kolye",
      image: "https://images.pexels.com/photos/1454173/pexels-photo-1454173.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      label: "Küpe",
      href: "/kategori/kupe",
      image: "https://images.pexels.com/photos/5370707/pexels-photo-5370707.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      label: "Bileklik",
      href: "/kategori/bileklik",
      image: "https://images.pexels.com/photos/5370704/pexels-photo-5370704.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      label: "Yüzük",
      href: "/kategori/yuzuk",
      image: "https://images.pexels.com/photos/5370706/pexels-photo-5370706.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
  ];

  return (
    <main className="bg-[#faf8f5] pb-20">
      <ViewItemListTracker listName="Homepage Best Sellers" listId="home_best_sellers" items={bestSellerItems} />
      <ViewItemListTracker listName="Homepage New Arrivals" listId="home_new_arrivals" items={newArrivalItems} />

      <HomeHero imageSrc={HERO_IMAGE} videoUrl={heroVideoUrl} />

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
                    summary={p.short_description}
                    imageUrl={p.product_images?.[0]?.image_url ?? "https://picsum.photos/id/99/900/900"}
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
              href="/koleksiyonlar"
              className="mt-6 inline-flex text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--brand-gold)] underline-offset-[6px] transition hover:text-stone-800 hover:underline"
            >
              Hikayemizi keşfet
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
                    summary={p.short_description}
                    imageUrl={p.product_images?.[0]?.image_url ?? "https://picsum.photos/id/90/900/900"}
                    price={Number(p.price)}
                    compareAtPrice={p.compare_at_price ? Number(p.compare_at_price) : null}
                    category={p.category?.name}
                    collection={p.collection?.name ?? null}
                    imageForward
                    imageEmphasis="high"
                    conversionOverlay
                    badges={{ bestseller: p.featured, new: p.new_arrival }}
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

      <FadeIn delay={0.04}>
        <section className="border-t border-[#ebe6df] bg-[#faf8f5] py-14 sm:py-16">
          <div className="container-premium">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-stone-500">Koleksiyon</p>
              <h2 className="mt-3 font-serif text-2xl font-light tracking-tight text-stone-900 sm:text-3xl">
                Ruhunu yansıtan seriler
              </h2>
              <p className="mt-2 text-sm font-light text-stone-600">Her seri kendi ışığını taşır.</p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {collectionPreview.map((c) => {
                const cover = collectionHeroImage[c.slug] ?? collectionFallbackImage;
                return (
                  <CinematicLinkCard
                    key={c.id}
                    href={`/urunler?koleksiyon=${c.slug}`}
                    imageSrc={cover}
                    title={c.name}
                    kicker=""
                    cta="Keşfet"
                    description={null}
                    preset="collection"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                );
              })}
            </div>
          </div>
        </section>
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

      <FadeIn>
        <section className="container-premium py-12 sm:py-16">
          <div className="rounded-[2rem] border border-[#e8e3da] bg-[#fdfcfa] px-6 py-10 shadow-[0_20px_48px_rgba(55,48,40,0.06)] sm:px-10 sm:py-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-light text-stone-900">Instagram&apos;da #zelulastyle</h2>
                <p className="mt-2 text-sm font-light text-stone-600">Gerçek kombinler, gerçek Zelula ışıltısı.</p>
              </div>
              <Link
                href={instagramProfileHref}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500 underline-offset-4 transition hover:text-stone-800 hover:underline"
              >
                Instagram
              </Link>
            </div>
            {instagramPosts.length > 0 ? (
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {instagramPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={post.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-xl border border-[#ebe6df] shadow-sm transition duration-500 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-[#e0d5c8] motion-safe:hover:shadow-[0_12px_32px_rgba(55,48,40,0.08)]"
                  >
                    <Image
                      src={post.imageUrl}
                      alt={post.caption}
                      width={500}
                      height={500}
                      className="aspect-square object-cover transition duration-[700ms] ease-out motion-safe:group-hover:scale-[1.04]"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                  {[
                    "https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?auto=compress&cs=tinysrgb&w=900",
                    "https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=900",
                    "https://images.pexels.com/photos/1454172/pexels-photo-1454172.jpeg?auto=compress&cs=tinysrgb&w=900",
                    "https://images.pexels.com/photos/10983783/pexels-photo-10983783.jpeg?auto=compress&cs=tinysrgb&w=900",
                  ].map((src, i) => (
                    <Link
                      key={`${src}-${i}`}
                      href={instagramProfileHref}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-xl border border-[#ebe6df] shadow-sm transition duration-500 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-[#e0d5c8] motion-safe:hover:shadow-[0_12px_32px_rgba(55,48,40,0.08)]"
                    >
                      <Image
                        src={src}
                        alt="Zelula Instagram önizleme"
                        width={500}
                        height={500}
                        className="aspect-square object-cover transition duration-[700ms] ease-out motion-safe:group-hover:scale-[1.04]"
                      />
                    </Link>
                  ))}
                </div>
                <div className="rounded-2xl border border-dashed border-[#e0d5c8] bg-[#faf8f5]/80 px-6 py-5 text-center">
                  <p className="text-sm font-light leading-relaxed text-stone-600">
                    Canlı akış kısa süreli erişilemiyor. En güncel paylaşımlar için profili ziyaret edebilirsin.
                  </p>
                  <Link
                    href={instagramProfileHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-stone-300/80 bg-white px-6 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-stone-700 transition hover:border-stone-400 hover:bg-[#faf8f5]"
                  >
                    Profili aç @{process.env.INSTAGRAM_USERNAME ?? "zelulaofficial"}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.05}>
        <HomeNewsletter />
      </FadeIn>
    </main>
  );
}
