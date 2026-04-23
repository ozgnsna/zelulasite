import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getHomeData } from "@/lib/storefront";
import Image from "next/image";
import { ChevronRight, Droplets, RotateCcw, Shield, Truck } from "lucide-react";
import { ViewItemListTracker } from "@/components/analytics/ViewItemListTracker";

export default async function HomePage() {
  const { categories, collections, bestSellers, newArrivals } = await getHomeData();
  /** Kategori slug → tam kanvas arka plan (kolye / küpe / yüzük / bileklik) */
  const categoryHeroImage: Record<string, string> = {
    kolye:
      "https://images.pexels.com/photos/9428777/pexels-photo-9428777.jpeg?auto=compress&cs=tinysrgb&w=1200",
    kupe:
      "https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=1200",
    yuzuk:
      "https://images.pexels.com/photos/5370707/pexels-photo-5370707.jpeg?auto=compress&cs=tinysrgb&w=1200",
    bileklik:
      "https://images.pexels.com/photos/5370704/pexels-photo-5370704.jpeg?auto=compress&cs=tinysrgb&w=1200",
  };
  const categoryFallbackImage =
    "https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?auto=compress&cs=tinysrgb&w=1200";
  const categoryDisplayOrder = ["kolye", "kupe", "yuzuk", "bileklik"];
  const sortedCategories = [...categories].sort(
    (a, b) =>
      categoryDisplayOrder.indexOf(a.slug) - categoryDisplayOrder.indexOf(b.slug),
  );
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

  return (
    <main className="pb-16">
      <ViewItemListTracker listName="Homepage Best Sellers" listId="home_best_sellers" items={bestSellerItems} />
      <ViewItemListTracker listName="Homepage New Arrivals" listId="home_new_arrivals" items={newArrivalItems} />
      <section className="relative overflow-hidden border-b border-[#eadfce] bg-gradient-to-b from-[#f6eee4] via-[#f9f5ef] to-transparent">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_30%_30%,rgba(214,186,162,0.35),transparent_60%)]" />
        <div className="container-premium relative grid gap-12 py-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-24 lg:py-28">
          <div className="flex max-w-xl flex-col justify-center rounded-2xl border border-[#ebe3d9]/80 bg-[#fffdfb]/75 p-6 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] backdrop-blur-[2px] sm:p-7 md:max-w-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none lg:max-w-2xl">
            <p className="editorial-kicker">Zelula</p>
            <h1 className="mt-4 font-serif text-[clamp(1.875rem,4.5vw,3.5rem)] font-normal leading-[1.1] tracking-[-0.02em] text-balance text-stone-950 sm:mt-5 sm:leading-[1.06] lg:text-[3.5rem] lg:tracking-[-0.025em]">
              Zamansız şıklık, her an seninle
            </h1>
            <p className="mt-6 max-w-xl rounded-xl border border-[#e5d9cc] bg-[#fffdfb]/90 px-4 py-3.5 text-[0.9375rem] font-medium leading-[1.65] tracking-tight text-stone-800 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] sm:mt-8 sm:px-5 sm:py-4 sm:text-base sm:leading-[1.7]">
              Kararma yapmaz • Suya dayanıklı • Antialerjik • Ücretsiz iade • Hızlı kargo
            </p>
            <div className="mt-9 sm:mt-11">
              <Link
                href="/koleksiyonlar"
                className="group inline-flex min-h-[3rem] w-full items-center justify-center gap-1.5 rounded-full bg-stone-950 px-10 py-3.5 text-[0.9375rem] font-semibold tracking-wide text-white shadow-[0_14px_34px_rgba(28,25,23,0.28)] transition hover:bg-stone-900 hover:shadow-[0_16px_38px_rgba(28,25,23,0.32)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 sm:w-auto sm:min-w-[15rem] sm:py-4 sm:text-sm"
              >
                Koleksiyonu Keşfet
                <ChevronRight
                  className="size-4 opacity-90 transition group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-stone-600 sm:mt-5 sm:text-sm">
              Bugün sipariş ver, yarın kargoda.
            </p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-[#e6dccf] bg-[#efe6da] shadow-[0_16px_38px_rgba(85,63,45,0.12)]">
            <Image
              src="https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?auto=compress&cs=tinysrgb&w=1400"
              alt="Model üzerinde Zelula takıları"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent p-6 pt-16 text-white sm:p-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/90">Aura</p>
              <p className="mt-2 max-w-sm font-serif text-xl leading-snug tracking-tight sm:text-2xl">
                Koleksiyonlarda seçilmiş parçalar
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-b border-[#e6dccf] bg-[#faf7f3]"
        aria-label="Güven vaatleri"
      >
        <div className="container-premium">
          <ul className="grid grid-cols-2 gap-x-5 gap-y-4 py-5 sm:grid-cols-4 sm:gap-x-0 sm:gap-y-0 sm:divide-x sm:divide-[#e5d9cc] sm:py-6">
            {(
              [
                { label: "Ücretsiz iade", Icon: RotateCcw },
                { label: "Hızlı kargo", Icon: Truck },
                { label: "Suya dayanıklı", Icon: Droplets },
                { label: "Antialerjik", Icon: Shield },
              ] as const
            ).map(({ label, Icon }) => (
              <li
                key={label}
                className="flex items-center gap-2.5 px-1 py-4 sm:gap-3 sm:px-4 sm:py-5 md:px-6"
              >
                <Icon
                  className="size-[15px] shrink-0 text-[#9a8478] sm:size-4"
                  strokeWidth={1.25}
                  aria-hidden
                />
                <span className="text-[13px] font-medium leading-snug tracking-tight text-stone-800 sm:text-sm">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-premium py-10 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="editorial-kicker">Seçki</p>
            <h2 className="section-title mt-3">En Çok Tercih Edilenler</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-600">
              Zelula müşterilerinin favorileri
            </p>
          </div>
          <Link href="/urunler" className="text-sm font-medium text-amber-900 hover:underline">
            Tümünü gör
          </Link>
        </div>
        <ul className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {bestSellers.slice(0, 4).map((p) => (
            <li key={p.id}>
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
                badges={{ bestseller: true, new: p.new_arrival }}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="container-premium py-12 sm:py-16">
        <p className="editorial-kicker">Mağaza</p>
        <h2 className="section-title mt-3">Kategoriler</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-600">
          Her kategoride seçilmiş parçaları keşfedin.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {sortedCategories.map((c) => {
            const src = categoryHeroImage[c.slug] ?? categoryFallbackImage;
            return (
              <li key={c.id}>
                <Link
                  href={`/urunler?kategori=${c.slug}`}
                  aria-label={`${c.name} kategorisine git`}
                  className="group relative isolate block aspect-[3/4] overflow-hidden rounded-2xl border border-[#e4d9cc] bg-stone-200 shadow-[0_12px_28px_rgba(55,45,35,0.08)] ring-1 ring-stone-900/5 transition duration-500 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(55,45,35,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800 sm:aspect-[4/5]"
                >
                  <Image
                    src={src}
                    alt=""
                    role="presentation"
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-900/35 to-stone-900/10"
                    aria-hidden
                  />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/65">
                      Keşfet
                    </p>
                    <p className="mt-2 font-serif text-2xl leading-tight tracking-tight text-white sm:text-[1.65rem]">
                      {c.name}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-white/80 transition group-hover:text-white">
                      Ürünleri gör
                      <ChevronRight className="size-3.5 opacity-80 transition group-hover:translate-x-0.5" aria-hidden />
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="container-premium py-12">
        <div className="grid gap-4 rounded-3xl border border-[#e8dece] bg-[#fffdfb] p-6 sm:grid-cols-3">
          {["Kararma yapmaz", "Suya dayanıklı", "Antialerjik"].map((text) => (
            <p key={text} className="rounded-2xl border border-[#eee4d8] bg-[#f9f4ec] px-4 py-3 text-sm text-stone-700">{text}</p>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-stone-500">Hızlı kargo • 14 gün kolay iade • Güvenli ödeme</p>
      </section>

      <section className="container-premium py-12">
        <div className="rounded-[2rem] border border-[#eadfce] bg-[#f7efe4] p-8 md:p-10">
          <p className="editorial-kicker">Satış Odaklı Seçki</p>
          <h3 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">En hızlı karar verilen ürünler önde</h3>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-stone-600">
            Ana sayfada ürün görünürlüğünü artırarak doğrudan satın alma akışına yönlendiriyoruz:
            güçlü hero, 4 çok satan ürün, görselli kategori blokları ve net güven mesajları.
          </p>
        </div>
      </section>

      <section className="container-premium py-12">
        <h2 className="section-title">Koleksiyonlar</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {collections.map((c) => (
            <Link key={c.id} href={`/urunler?koleksiyon=${c.slug}`} className="rounded-2xl border border-[#e7ddcf] bg-[#fffdfb] p-6 transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(70,53,38,0.08)]">
              <p className="font-serif text-xl text-stone-900">{c.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="yeni" className="container-premium py-12">
        <h2 className="section-title">Yeni Gelenler</h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {newArrivals.map((p) => (
            <li key={p.id}>
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
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="container-premium py-12">
        <div className="rounded-3xl border border-[#e8dece] bg-[#fffdfb] p-8">
          <h2 className="font-serif text-2xl">#zelulastyle</h2>
          <p className="mt-2 text-sm text-stone-600">Topluluğumuzdan gerçek görünümler</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((x) => (
              <Image key={x} src={`https://picsum.photos/id/${120 + x}/500/500`} alt="Instagram stil" width={500} height={500} className="aspect-square rounded-xl object-cover" />
            ))}
          </div>
        </div>
      </section>

      <section className="container-premium py-14">
        <div className="rounded-3xl border border-[#e8dece] bg-[#f7efe4] p-8 text-center">
          <h2 className="font-serif text-2xl">Zelula bültenine katılın</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-stone-600">Yeni koleksiyonlar, özel kampanyalar ve editoryal içerikler için e-posta listemize kaydolun.</p>
          <form className="mx-auto mt-6 flex max-w-md gap-2">
            <input className="w-full rounded-full border border-[#dccfbf] bg-white px-4 py-2.5 text-sm" placeholder="E-posta adresiniz" />
            <button className="rounded-full bg-stone-900 px-5 text-sm text-white">Katıl</button>
          </form>
        </div>
      </section>

      <section className="container-premium pb-4">
        <div className="rounded-3xl border border-[#e8dece] bg-white p-6 sm:p-8">
          <h3 className="font-serif text-2xl">Neden Zelula?</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-3 text-sm text-stone-600">
            <p>Ürün sayfasında materyal, bakım ve kargo detaylarını net gösterir.</p>
            <p>Ödeme akışında gereksiz adımları kaldırır, tek formda tamamlanır.</p>
            <p>Her siparişte ödeme doğrulaması ve operasyon takibi şeffaf ilerler.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
