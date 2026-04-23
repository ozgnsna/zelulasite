import Link from "next/link";
import { CheckoutForm } from "@/components/CheckoutForm";
import { CartLineControls } from "@/components/CartLineControls";
import { getDetailedCart } from "@/lib/cart";
import { formatTry } from "@/lib/money";

export const metadata = {
  title: "Sepet",
};

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ iptal?: string; msg?: string }>;
}) {
  const sp = await searchParams;
  const { lines, subtotal } = await getDetailedCart();
  const empty = lines.length === 0;
  const lineCount = lines.reduce((s, i) => s + i.quantity, 0);
  const shippingText = subtotal >= 750 ? "Ücretsiz kargo" : "750 TL üzeri ücretsiz kargo";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-serif text-3xl font-medium text-stone-900 sm:text-4xl">Sepet</h1>
      {sp.iptal ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {sp.msg === "card_declined"
            ? "Kart işlemi bankanız tarafından onaylanmadı. Farklı kartla tekrar deneyebilirsiniz."
            : sp.msg === "timeout"
              ? "Ödeme adımında zaman aşımı oluştu. Sepetiniz korundu."
              : sp.msg === "verify_failed"
                ? "Ödeme doğrulaması tamamlanamadı. Lütfen tekrar deneyin."
                : "Ödeme iptal edildi. Sepetiniz aynı kaldı."}
        </p>
      ) : null}

      {empty ? (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-16 text-center">
          <p className="text-stone-600">Sepetiniz boş.</p>
          <Link
            href="/urunler"
            className="mt-6 inline-flex rounded-full bg-stone-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
          >
            Alışverişe başla
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
          <ul className="space-y-4">
            {lines.map((line) => (
              <CartLineControls
                key={line.product.id}
                line={{
                  id: line.product.id,
                  quantity: line.quantity,
                  product: {
                    id: line.product.id,
                    name: line.product.name,
                    slug: line.product.slug,
                    imageUrl: line.product.product_images?.[0]?.image_url ?? "https://picsum.photos/id/90/900/900",
                    price: Number(line.product.price),
                    stock: line.product.stock_quantity,
                    category: line.product.category?.name,
                    collection: line.product.collection?.name ?? null,
                  },
                }}
              />
            ))}
          </ul>

          <div className="space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-medium text-stone-900">Özet</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-stone-600">
                  <dt>Ürün ({lineCount})</dt>
                  <dd>{formatTry(subtotal)}</dd>
                </div>
                <div className="flex justify-between border-t border-stone-100 pt-3 text-base font-semibold text-stone-900">
                  <dt>Ara toplam</dt>
                  <dd>{formatTry(subtotal)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-stone-500">
                KDV ve kargo kuralları canlı mağazada netleştirilir; bu demo
                ara toplamı gösterir.
              </p>
              <p className="mt-1 text-xs text-stone-500">{shippingText}</p>
            </div>
            <CheckoutForm
              items={lines.map((line) => ({
                product_id: line.product.id,
                product_name: line.product.name,
                price: Number(line.product.price),
                quantity: line.quantity,
                category: line.product.category?.name,
                collection: line.product.collection?.name ?? null,
              }))}
            />
          </div>
        </div>
      )}
      {!empty ? (
        <div className="fixed inset-x-0 bottom-3 z-30 mx-auto w-[calc(100%-1rem)] max-w-md rounded-2xl border border-stone-200 bg-white p-3 shadow-lg lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-stone-500">{lineCount} ürün</p>
              <p className="font-semibold">{formatTry(subtotal)}</p>
            </div>
            <a href="#checkout-form" className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white">
              Ödemeye Geç
            </a>
          </div>
        </div>
      ) : null}
    </main>
  );
}
