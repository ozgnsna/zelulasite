import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getHomeData } from "@/lib/storefront";
import Image from "next/image";
import { ViewItemListTracker } from "@/components/analytics/ViewItemListTracker";

export default async function HomePage() {
  const { categories, collections, bestSellers, newArrivals } = await getHomeData();
  const categoryVisuals = [
    "https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=900",
    "https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?auto=compress&cs=tinysrgb&w=900",
    "https://images.pexels.com/photos/10983783/pexels-photo-10983783.jpeg?auto=compress&cs=tinysrgb&w=900",
    "https://images.pexels.com/photos/9428777/pexels-photo-9428777.jpeg?auto=compress&cs=tinysrgb&w=900",
  ];
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
        <div className="container-premium relative grid gap-12 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24 lg:py-28">
          <div className="flex flex-col justify-center">
            <p className="editorial-kicker">Zelula</p>
            <h1 className="editorial-title mt-5 max-w-2xl">Günlük stilini tamamlayan premium takılar</h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-stone-600">
              Model üzerinde gerçek kullanım hissiyle seçilmiş parçalar. Daha hızlı karar, daha net ürün deneyimi, zahmetsiz satın alma.
            </p>
            <div className="mt-11 flex flex-wrap items-center gap-4">
              <Link
                href="/urunler"
                className="inline-flex items-center justify-center rounded-full bg-stone-900 px-9 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(25,25,25,0.22)] transition hover:bg-stone-800"
              >
                Hemen keşfet
              </Link>
              <Link
                href="/koleksiyonlar"
                className="text-sm font-medium text-stone-700 underline-offset-4 transition hover:text-stone-900 hover:underline"
              >
                Editoryal seçkiler
              </Link>
            </div>
            <p className="mt-4 text-xs text-stone-500">Bugün sipariş ver, yarın kargoda.</p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-[#e6dccf] bg-[#efe6da] shadow-[0_16px_38px_rgba(85,63,45,0.12)]">
            <Image
              src="https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?auto=compress&cs=tinysrgb&w=1400"
              alt="Model üzerinde Zelula takıları"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent p-6 text-white">
              <p className="text-xs uppercase tracking-[0.2em]">Yeni drop</p>
              <p className="mt-2 font-serif text-2xl">Model Üzerinde: Aura Collection</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-premium py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="editorial-kicker">Most Loved</p>
            <h2 className="section-title mt-3">Best Seller Seçkiler</h2>
            <p className="mt-2 text-sm text-stone-500">En çok tercih edilen ürünlerden. Hızlı karar için öne çıkan seçki.</p>
          </div>
          <Link href="/urunler" className="text-sm font-medium text-amber-900 hover:underline">
            Tümünü gör
          </Link>
        </div>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="container-premium py-12 sm:py-16">
        <h2 className="section-title">Kategoriler</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c, idx) => (
            <Link key={c.id} href={`/urunler?kategori=${c.slug}`} className="group relative overflow-hidden rounded-2xl border border-[#e7ddcf] bg-[#fffdfb] p-6 transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(70,53,38,0.08)]">
              <Image
                src={categoryVisuals[idx % categoryVisuals.length]}
                alt={c.name}
                fill
                className="object-cover opacity-25 transition duration-500 group-hover:scale-105 group-hover:opacity-35"
              />
              <div className="relative">
                <p className="font-serif text-xl text-stone-900">{c.name}</p>
                <p className="mt-1.5 text-sm text-stone-700">Gerçek takı fotoğraflarıyla seçki</p>
              </div>
            </Link>
          ))}
        </div>
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
