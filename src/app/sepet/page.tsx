import Link from "next/link";
import { CheckoutForm } from "@/components/CheckoutForm";
import { CartFreeShippingBar } from "@/components/cart/CartFreeShippingBar";
import { CartUpsellStrip } from "@/components/cart/CartUpsellStrip";
import { getUserLoyaltyBalance } from "@/lib/loyalty/balance";
import { createClient } from "@/lib/supabase/server";
import { CartLineControls } from "@/components/CartLineControls";
import { getDetailedCart } from "@/lib/cart";
import { formatTry } from "@/lib/money";
import { getCartUpsellProducts } from "@/lib/storefront";
import { pickProductCoverImageUrl } from "@/lib/products/cover-image";
import { FREE_SHIPPING_THRESHOLD_TRY } from "@/lib/free-shipping";
import { listSavedAddressesForUser } from "@/lib/account/saved-addresses";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle()
    : { data: null };
  const loyaltyAvailablePoints = user?.id ? await getUserLoyaltyBalance(supabase, user.id) : 0;
  const savedAddresses = user?.id ? await listSavedAddressesForUser(supabase, user.id) : [];
  const empty = lines.length === 0;
  const lineCount = lines.reduce((s, i) => s + i.quantity, 0);
  const instagramUsername = process.env.INSTAGRAM_USERNAME ?? "zelulaofficial";
  const instagramProfileHref = `https://www.instagram.com/${instagramUsername}`;
  const promoCampaignActive = Boolean(process.env.INSTAGRAM_FOLLOWER_PROMO_CODE?.trim());
  const freeShippingThreshold = FREE_SHIPPING_THRESHOLD_TRY;
  const shippingRemaining = Math.max(0, freeShippingThreshold - subtotal);
  const shippingCost = shippingRemaining > 0 ? 89 : 0;

  const upsellProducts = empty
    ? []
    : await getCartUpsellProducts(
        lines.map((line) => ({
          id: line.product.id,
          name: line.product.name,
          categoryName: line.product.category?.name,
          collectionId: line.product.collection?.id ?? null,
          material: line.product.material,
          color: line.product.color,
          price: Number(line.product.price),
        })),
        3,
      );
  const upsellItems = upsellProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    imageUrl: pickProductCoverImageUrl(p.product_images, "https://picsum.photos/id/90/900/900"),
    stock: p.stock_quantity,
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-serif text-3xl font-light text-stone-900 sm:text-4xl">Sepet</h1>
      {sp.iptal ? (
        <p className="mt-4 rounded-xl border border-[#e8dfd3] bg-[#faf8f5] px-4 py-3 text-sm font-light text-stone-800">
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
        <div className="mt-10 rounded-2xl border border-[#ebe6df]/90 bg-[linear-gradient(180deg,#fffdfb_0%,#faf7f2_100%)] px-6 py-16 text-center shadow-[0_12px_32px_rgba(62,52,38,0.06)]">
          <p className="font-serif text-lg font-light text-stone-800">Zelula koleksiyonunu keşfetmeye ne dersin?</p>
          <p className="mx-auto mt-3 max-w-md text-sm font-light leading-relaxed text-stone-600">
            Sana yakışan parçalar sessizce bekliyor; keşfetmek için güzel bir an ✨
          </p>
          <Link
            href="/urunler"
            className="mt-8 inline-flex rounded-full bg-[linear-gradient(135deg,#C6A15B,#E8C98B)] px-8 py-3 text-sm font-medium text-[#2f271f] shadow-[0_10px_24px_rgba(198,161,91,0.28)] transition hover:brightness-[0.97] hover:shadow-[0_14px_30px_rgba(198,161,91,0.36)]"
          >
            Ürünleri keşfet
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <CartFreeShippingBar subtotal={subtotal} />

          <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-10">
            <div className="space-y-6 rounded-2xl border border-[#e8dccb]/85 bg-[linear-gradient(180deg,#fffdfb_0%,#f6f0e6_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#e8dccb]/80 pb-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">Sepet özeti</p>
                  <p className="mt-1 font-serif text-lg text-stone-900">
                    {lineCount} ürün · {formatTry(subtotal)}
                  </p>
                </div>
              </div>
              <ul className="space-y-5">
                {lines.map((line) => (
                  <CartLineControls
                    key={`${line.product.id}::${line.variantId ?? ""}`}
                    line={{
                      id: line.product.id,
                      quantity: line.quantity,
                      giftCard: line.giftCard,
                      variantId: line.variantId,
                      variantLabel: line.variantLabel,
                      product: {
                        id: line.product.id,
                        name: line.product.name,
                        slug: line.product.slug,
                        imageUrl:
                          pickProductCoverImageUrl(line.product.product_images, "https://picsum.photos/id/90/900/900"),
                        price: Number(line.product.price),
                        stock: line.variantId ? Number(line.variantStock ?? 0) : line.product.stock_quantity,
                        category: line.product.category?.name,
                        collection: line.product.collection?.name ?? null,
                      },
                    }}
                  />
                ))}
              </ul>

              <CartUpsellStrip items={upsellItems} />

              <p className="text-[12px] text-stone-600">Bugün birçok kişi bu ürünü tercih etti</p>
            </div>

            <div className="lg:sticky lg:top-24 lg:self-start">
              <CheckoutForm
                subtotal={subtotal}
                shippingCost={shippingCost}
                shippingRemaining={shippingRemaining}
                promoCampaignActive={promoCampaignActive}
                instagramUsername={instagramUsername}
                instagramProfileHref={instagramProfileHref}
                lineCount={lineCount}
                isSignedIn={Boolean(user)}
                accountEmail={user?.email ?? null}
                accountFullName={profile?.full_name ?? null}
                accountPhone={profile?.phone ?? null}
                loyaltyAvailablePoints={loyaltyAvailablePoints}
                savedAddresses={savedAddresses}
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
        </div>
      )}
    </main>
  );
}
