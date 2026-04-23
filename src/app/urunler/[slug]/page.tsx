import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductGallery } from "@/components/ProductGallery";
import { getProductBySlug, getProducts } from "@/lib/storefront";
import { formatTry } from "@/lib/money";
import { ViewItemTracker } from "@/components/analytics/ViewItemTracker";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Ürün" };
  return {
    title: product.name,
    description: product.short_description,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <main className="container-premium py-12 sm:py-16">
      <ViewItemTracker
        item={{
          product_id: product.id,
          product_name: product.name,
          price: Number(product.price),
          quantity: 1,
          category: product.category?.name,
          collection: product.collection?.name ?? null,
        }}
      />
      <nav className="text-sm text-stone-500">
        <Link href="/urunler" className="hover:text-stone-800">
          Ürünler
        </Link>
        <span className="mx-2">/</span>
        <span className="text-stone-800">{product.name}</span>
      </nav>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
        <ProductGallery
          images={product.product_images ?? []}
          fallback="https://picsum.photos/id/15/1200/1200"
          alt={product.name}
        />

        <div className="lg:pt-6">
          <p className="editorial-kicker text-amber-900/90">{product.category?.name}</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-stone-900 sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">
            {product.short_description}. Günlük kombinleri zahmetsizce premium gösteren, uzun ömürlü bir seçim.
          </p>
          <p className="mt-7 text-3xl font-semibold tracking-tight text-stone-900">{formatTry(Number(product.price))}</p>
          <p className="mt-2 text-sm text-stone-500">
            Stok: {product.stock_quantity > 0 ? `${product.stock_quantity} adet` : "Tükendi"}
          </p>
          {product.stock_quantity > 0 && product.stock_quantity < 8 ? (
            <p className="mt-1 text-xs font-medium text-rose-700">Stoklar hızla tükeniyor.</p>
          ) : (
            <p className="mt-1 text-xs text-stone-500">En çok tercih edilen ürünlerden.</p>
          )}

          <div className="mt-8 max-w-md">
            <AddToCartButton
              productId={product.id}
              productName={product.name}
              price={Number(product.price)}
              category={product.category?.name}
              collection={product.collection?.name ?? null}
              stock={product.stock_quantity}
            />
          </div>
          <button className="mt-3 w-full max-w-md rounded-full border border-[#d8cab8] bg-white px-6 py-3 text-sm font-medium text-stone-800 transition hover:bg-[#f9f2e9]">Hemen Al</button>
          <div className="mt-4 grid max-w-md grid-cols-3 gap-2 text-xs text-stone-600">
            <p className="rounded-lg border border-[#e8dece] bg-[#f8f2e9] px-2 py-1.5 text-center">Suya dayanıklı</p>
            <p className="rounded-lg border border-[#e8dece] bg-[#f8f2e9] px-2 py-1.5 text-center">Antialerjik</p>
            <p className="rounded-lg border border-[#e8dece] bg-[#f8f2e9] px-2 py-1.5 text-center">Hızlı kargo</p>
          </div>
          <p className="mt-2 text-xs text-stone-500">Bugün sipariş ver, yarın kargoda.</p>

          <div className="mt-14 space-y-8 border-t border-[#e8dece] pt-10">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
                Ürün hikâyesi
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-700">
                {product.full_description}
              </p>
            </section>
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#e6dccf] bg-[#fffdfb] p-5 shadow-[0_8px_20px_rgba(70,53,38,0.05)]">
                <h3 className="text-sm font-medium text-stone-900">Materyal</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{product.material ?? "Premium alaşım"}</p>
              </div>
              <div className="rounded-2xl border border-[#e6dccf] bg-[#fffdfb] p-5 shadow-[0_8px_20px_rgba(70,53,38,0.05)]">
                <h3 className="text-sm font-medium text-stone-900">Bakım</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">Parfüm temasından kaçının, kuru bezle silerek saklayın.</p>
              </div>
            </section>
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#e6dccf] bg-[#fffdfb] p-5 shadow-[0_8px_20px_rgba(70,53,38,0.05)]">
                <h3 className="text-sm font-medium text-stone-900">Kargo</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  Sipariş onayından sonra hazırlık süresi ayrıca bildirilir; demo
                  ortamında gerçek kargo yoktur.
                </p>
              </div>
              <div className="rounded-2xl border border-[#e6dccf] bg-[#fffdfb] p-5 shadow-[0_8px_20px_rgba(70,53,38,0.05)]">
                <h3 className="text-sm font-medium text-stone-900">İade</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  Ürünü orijinal kutusuyla iade edebilirsiniz. Politika metnini
                  canlıya alırken hukuk danışmanlığı önerilir.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <RelatedProducts currentProductId={product.id} />
      <StyledWithSection currentProductId={product.id} collectionId={product.collection_id ?? null} />
      <div className="fixed inset-x-0 bottom-3 z-30 mx-auto w-[calc(100%-1rem)] max-w-md rounded-2xl border border-stone-200 bg-white p-3 shadow-lg md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-stone-500">Toplam</p>
            <p className="font-semibold">{formatTry(Number(product.price))}</p>
            <p className="text-[11px] text-stone-500">Hızlı kargo</p>
          </div>
          <AddToCartButton
            productId={product.id}
            productName={product.name}
            price={Number(product.price)}
            category={product.category?.name}
            collection={product.collection?.name ?? null}
            stock={product.stock_quantity}
          />
        </div>
      </div>
    </main>
  );
}

async function RelatedProducts({ currentProductId }: { currentProductId: string }) {
  const { products } = await getProducts({ sort: "featured" });
  const list = products.filter((p) => p.id !== currentProductId).slice(0, 4);
  if (list.length === 0) return null;
  return (
    <section className="mt-20">
      <h2 className="section-title">Benzer Ürünler</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((p) => (
          <Link key={p.id} href={`/urunler/${p.slug}`} className="rounded-2xl border border-[#e6dccf] bg-[#fffdfb] p-4 text-sm transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(70,53,38,0.08)]">
            {p.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

async function StyledWithSection({
  currentProductId,
  collectionId,
}: {
  currentProductId: string;
  collectionId: string | null;
}) {
  const { products } = await getProducts({ sort: "newest" });
  const list = products
    .filter((p) => p.id !== currentProductId && (collectionId ? p.collection_id === collectionId : true))
    .slice(0, 4);
  if (list.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="section-title">Birlikte İyi Gider</h2>
      <p className="mt-2 text-sm text-stone-500">Bu ürünle birlikte en çok tercih edilen kombinler</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((p) => (
          <Link key={p.id} href={`/urunler/${p.slug}`} className="rounded-2xl border border-[#e6dccf] bg-[#fffdfb] p-4 text-sm transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(70,53,38,0.08)]">
            <p className="font-medium">{p.name}</p>
            <p className="mt-1 text-xs text-stone-500">{p.short_description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
