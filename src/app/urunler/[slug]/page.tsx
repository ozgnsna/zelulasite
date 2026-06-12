import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Check, MessageCircle, Sparkles } from "lucide-react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductReferralShare } from "@/components/referral/ProductReferralShare";
import { ProductGallery } from "@/components/ProductGallery";
import { RelatedProductsCarousel } from "@/components/RelatedProductsCarousel";
import { getProductBySlug, getProducts } from "@/lib/storefront";
import { formatTry } from "@/lib/money";
import { ViewItemTracker } from "@/components/analytics/ViewItemTracker";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isProductFavorited } from "@/lib/account/favorites";
import { ensureUserReferralCode } from "@/lib/referral/server";
import { ProductFavoriteButton } from "@/components/ProductFavoriteButton";
import { getSupportWhatsAppHref } from "@/lib/support-contact";
import { TrackedExternalLink } from "@/components/analytics/TrackedExternalLink";
import { ProductPdpShippingCard } from "@/components/product/ProductPdpShippingCard";
import { ProductPdpTraitOptions } from "@/components/product/ProductPdpTraitOptions";
import { ProductVariantProvider } from "@/components/product/ProductVariantContext";
import { ProductSizeSelector } from "@/components/product/ProductSizeSelector";
import { buildPdpShippingPromise } from "@/lib/storefront/pdp-shipping";
import { resolvePdpTraitGroups } from "@/lib/storefront/pdp-traits";
import { fetchProductVariants } from "@/lib/products/variants";
import { normalizeProductImages } from "@/lib/products/cover-image";
import {
  buildProductBreadcrumbJsonLd,
  buildProductJsonLd,
  buildProductPageMetadata,
} from "@/lib/seo/product";
import { JsonLd } from "@/components/seo/JsonLd";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

const ZODIAC_GALLERY_EXTRAS: { id: string; image_url: string }[] = [
  {
    id: "zodiac-model-1",
    image_url:
      "https://images.pexels.com/photos/10983783/pexels-photo-10983783.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    id: "zodiac-detail-1",
    image_url:
      "https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
];

function isZodiacStoryProduct(slug: string, name: string) {
  const s = slug.toLowerCase();
  const n = name.toLowerCase();
  return s.includes("kova") || s.includes("aquarius") || n.includes("kova") || n.includes("aquarius");
}

function splitDescriptionParagraphs(text: string): string[] {
  return text
    .trim()
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function normalizeCopyText(text: string) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Kesilmiş özet (… ile biten) veya kısaltılmış kopya tespiti. */
function excerptStem(text: string) {
  return normalizeCopyText(text)
    .replace(/\.{2,}$/, "")
    .replace(/\s+\S{0,4}$/, "")
    .trim();
}

function isDuplicateOrPrefixOf(a: string, b: string) {
  const left = normalizeCopyText(a);
  const right = normalizeCopyText(b);
  if (!left || !right) return false;
  if (left === right || right.startsWith(left) || left.startsWith(right)) return true;

  const leftStem = excerptStem(a);
  const rightStem = excerptStem(b);
  if (leftStem.length >= 48 && right.startsWith(leftStem)) return true;
  if (rightStem.length >= 48 && left.startsWith(rightStem)) return true;

  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  const probeLen = Math.min(140, shorter.length);
  if (probeLen >= 48 && longer.startsWith(shorter.slice(0, probeLen))) return true;

  return false;
}

function dedupeDescriptionParagraphs(paragraphs: string[]): string[] {
  const result: string[] = [];
  for (const paragraph of paragraphs) {
    const dupIndex = result.findIndex(
      (existing) => isDuplicateOrPrefixOf(existing, paragraph) || isDuplicateOrPrefixOf(paragraph, existing),
    );
    if (dupIndex === -1) {
      result.push(paragraph);
      continue;
    }
    if (normalizeCopyText(paragraph).length > normalizeCopyText(result[dupIndex]).length) {
      result[dupIndex] = paragraph;
    }
  }
  return result;
}

/** PDP açıklaması yalnızca solda; kısa + uzun metin tekrarsız birleştirilir. */
function productDescriptionParagraphs(shortRaw: string, fullRaw: string): string[] {
  const short = shortRaw.trim();
  let paragraphs = splitDescriptionParagraphs(fullRaw);

  if (short) {
    if (paragraphs.length === 0) {
      paragraphs = [short];
    } else if (!isDuplicateOrPrefixOf(short, paragraphs[0] ?? "")) {
      paragraphs = [short, ...paragraphs];
    }
  }

  return dedupeDescriptionParagraphs(paragraphs);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Ürün" };
  return buildProductPageMetadata(product);
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const galleryExtras =
    isZodiacStoryProduct(slug, product.name) ? ZODIAC_GALLERY_EXTRAS : [];
  const galleryImages = normalizeProductImages(product.product_images);
  const storyParagraphs = productDescriptionParagraphs(product.short_description, product.full_description);
  const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;
  const priceNum = Number(product.price);
  const hasRealDiscount = Boolean(compareAt && compareAt > priceNum);
  const discountAmount = hasRealDiscount ? Math.round((compareAt ?? 0) - priceNum) : 0;
  const stockQty = Number(product.stock_quantity ?? 0);
  const isLowStock = stockQty > 0 && stockQty <= 3;
  const supportMessage = "Merhaba, Zelula’daki bir ürün hakkında bilgi almak istiyorum ✨";
  const whatsappSupportHref = getSupportWhatsAppHref(supportMessage);
  const pdpVideoUrl = process.env.NEXT_PUBLIC_PDP_VIDEO_URL?.trim() || null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const [favorited, referralCode, traitGroups, shippingPromise, variants] = await Promise.all([
    user?.id ? isProductFavorited(supabase, user.id, product.id) : Promise.resolve(false),
    user?.id ? ensureUserReferralCode(admin, user.id) : Promise.resolve(null),
    resolvePdpTraitGroups(product, admin),
    Promise.resolve(buildPdpShippingPromise()),
    fetchProductVariants(supabase, product.id),
  ]);
  return (
    <main className="container-premium pb-28 pt-8 sm:pb-16 sm:pt-10">
      <JsonLd
        data={[
          buildProductJsonLd({
            ...product,
            categoryName: product.category?.name ?? null,
          }),
          buildProductBreadcrumbJsonLd({
            ...product,
            categorySlug: product.category?.slug ?? product.categorySlug ?? null,
            categoryName: product.category?.name ?? null,
          }),
        ]}
      />
     <ProductVariantProvider variants={variants}>
      <ViewItemTracker
        item={{
          product_id: product.id,
          product_name: product.name,
          price: priceNum,
          quantity: 1,
          category: product.category?.name,
          collection: product.collection?.name ?? null,
        }}
      />
      <nav className="text-sm text-stone-500">
        <Link href="/urunler" className="transition hover:text-brand-gold">
          Ürünler
        </Link>
        <span className="mx-2 text-stone-400">/</span>
        <span className="text-stone-800">{product.name}</span>
      </nav>

      <div className="pdp-page-enter mt-7 grid gap-7 lg:mt-8 lg:grid-cols-[0.95fr_1.15fr] lg:items-start lg:gap-9">
        <section className="mx-auto w-full max-w-[540px] lg:col-start-1 lg:max-w-[450px]">
          <ProductGallery
            images={galleryImages}
            extraImages={galleryExtras}
            fallback="https://picsum.photos/id/15/1200/1200"
            alt={product.name}
            loopVideoUrl={pdpVideoUrl}
          />
        </section>

        <section className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24 lg:pt-0.5">
          {(product.featured || product.new_arrival) && (
            <div className="flex flex-wrap items-center gap-2.5">
              {product.featured ? (
                <span
                  className="pdp-badge-in rounded-full border-2 border-brand-gold/60 bg-gradient-to-r from-stone-900 to-stone-800 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#fdf6e9] shadow-[0_6px_16px_rgba(201,168,106,0.26)]"
                  style={{ animationDelay: "0ms" }}
                >
                  Çok Satan
                </span>
              ) : null}
              {product.new_arrival ? (
                <span
                  className="pdp-badge-in rounded-full border-2 border-brand-gold/55 bg-brand-rose/90 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-800 shadow-[0_6px_16px_rgba(201,168,106,0.14)]"
                  style={{ animationDelay: "70ms" }}
                >
                  Yeni
                </span>
              ) : null}
            </div>
          )}

          <div
            className={`flex flex-wrap items-start justify-between gap-3 ${product.featured || product.new_arrival ? "mt-3" : ""}`}
          >
            <h1 className="min-w-0 flex-1 font-serif text-4xl font-light leading-[1.08] tracking-tight text-stone-900 sm:text-5xl">
              {product.name}
            </h1>
            <ProductFavoriteButton
              key={`fav-pdp-${product.id}-${favorited ? "1" : "0"}`}
              variant="inline"
              productId={product.id}
              productSlug={slug}
              initialFavorited={favorited}
              isSignedIn={Boolean(user)}
            />
          </div>

          {isZodiacStoryProduct(slug, product.name) ? (
            <aside className="mt-8 max-w-xl border-l-[3px] border-brand-gold/60 bg-[#faf8f5]/90 px-5 py-5 sm:px-6 sm:py-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-stone-500">Seçilmiş parça</p>
              <p className="mt-3 flex items-start gap-2.5 font-serif text-lg font-light leading-[1.55] text-stone-800 sm:text-xl">
                <Sparkles className="mt-1 size-4 shrink-0 text-[color:var(--brand-gold)] sm:size-[1.05rem]" strokeWidth={1.5} aria-hidden />
                Kova burcunun özgür ve vizyoner ruhunu taşıyan bu parça, sıradan bir aksesuardan fazlası: her bakışta
                hatırlanacak duygusal bir bağ kurar. Kendinize veya hayatınızdaki o eşsiz Kovaya, zarafeti ve anlamı
                bir arada sunar.
              </p>
            </aside>
          ) : null}

          {traitGroups.length > 0 ? (
            <div className="mt-4 block w-full">
              <ProductPdpTraitOptions groups={traitGroups} />
            </div>
          ) : null}

          <section className="pdp-reveal-cta mt-6 max-w-none space-y-4 rounded-2xl border border-[#ebe6df] bg-white p-5 shadow-[0_8px_28px_rgba(62,52,38,0.08)] sm:space-y-5 sm:p-6">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-end gap-2.5">
                {hasRealDiscount ? (
                  <span className="text-sm text-stone-400 line-through sm:text-base">{formatTry(compareAt ?? 0)}</span>
                ) : null}
                <p className="text-[2.85rem] font-bold leading-none tracking-tight text-[#7d5f35] sm:text-[3.35rem]">
                  {formatTry(priceNum)}
                </p>
              </div>
              {hasRealDiscount ? (
                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
                  {formatTry(discountAmount)} indirim
                </span>
              ) : (
                <span className="inline-flex rounded-full border border-[#eadfce] bg-[#faf7f2] px-2.5 py-1 text-[11px] font-medium text-stone-600">
                  Bugüne özel fiyat
                </span>
              )}
            </div>

            <ProductPdpShippingCard promise={shippingPromise} />

            {variants.length > 0 ? <ProductSizeSelector title="Ölçü" /> : null}

            <AddToCartButton
              productId={product.id}
              productName={product.name}
              price={priceNum}
              category={product.category?.name}
              collection={product.collection?.name ?? null}
              stock={product.stock_quantity}
              tone="luxury"
              label="Şimdi satın al"
              secondaryLabel="🛒 Stiline Ekle"
              helperText="Sana özel güvenli ödeme; siparişin özenle hazırlanır."
              redirectAfterAdd="/sepet"
              productSlug={product.slug}
              className="[&_button]:w-full [&_button]:py-4 [&_button]:text-sm [&_button]:font-bold [&_button]:transition [&_button]:duration-150 [&_button]:ease-in-out [&_button:hover]:scale-[1.01] [&_button:hover]:shadow-[0_14px_28px_rgba(30,24,18,0.24)]"
            />

            <ul className="space-y-2.5 text-[12px] leading-relaxed text-stone-800">
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-[#b8945f]" strokeWidth={1.8} aria-hidden />
                Güvenli ödeme
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-[#b8945f]" strokeWidth={1.8} aria-hidden />
                Hızlı kargo
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-[#b8945f]" strokeWidth={1.8} aria-hidden />
                Kolay iade
              </li>
            </ul>

            {stockQty > 0 ? (
              <p
                className={`inline-flex w-fit rounded-full px-3 py-1 text-[12px] font-medium ${
                  isLowStock ? "border border-amber-200 bg-amber-50 text-amber-800" : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {isLowStock ? `Son ${stockQty} ürün` : "Stokta var"}
              </p>
            ) : (
              <p className="inline-flex w-fit rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-[12px] font-medium text-stone-700">
                Şu an stokta yok
              </p>
            )}

            <div className="space-y-2">
              <p className="text-[12px] font-medium text-stone-700">Sorunuz mu var?</p>
              <div className="flex flex-wrap items-center gap-2">
                <TrackedExternalLink
                  href={whatsappSupportHref}
                  eventType="whatsapp_click"
                  location="pdp_support"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9ccb9] bg-[#fdfbf8] px-3 py-1.5 text-[11px] font-medium text-stone-800 transition hover:border-[#c6a15b]/60 hover:bg-[#f9f1e4] hover:shadow-[0_8px_18px_rgba(198,161,91,0.18)]"
                >
                  <MessageCircle className="size-3.5 shrink-0 text-[#b8945f]" strokeWidth={1.6} aria-hidden />
                  WhatsApp destek
                </TrackedExternalLink>
                <Link
                  href="/sepet"
                  className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-stone-50"
                >
                  Sepeti görüntüle
                </Link>
              </div>
            </div>

            <ProductReferralShare referralCode={referralCode} />
          </section>

        </section>

        <section className="space-y-7 border-t border-brand-gold/20 pt-7 lg:col-start-1 lg:mt-1 sm:space-y-8 sm:pt-8">
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-gold">
              Bu parça neden özel?
            </h2>
            <div className="mt-5 space-y-4 text-[15px] leading-[1.75] text-stone-700">
              {storyParagraphs.length > 0 ? (
                storyParagraphs.map((para, i) => <p key={i}>{para}</p>)
              ) : (
                <p className="text-stone-600">Ürün detayları yakında eklenecek.</p>
              )}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-brand-gold/20 bg-[#fffdfb] p-6 shadow-[0_10px_26px_rgba(70,53,38,0.06)] transition hover:shadow-[0_14px_30px_rgba(70,53,38,0.1)]">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-brand-gold">Materyal</h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-700">
                <span className="font-medium text-stone-900">{product.material ?? "Premium alaşım"}</span> — günlük
                kullanımda dayanıklılık ve parlaklık için seçildi.
              </p>
            </div>
            <div className="rounded-2xl border border-brand-gold/20 bg-[#fffdfb] p-6 shadow-[0_10px_26px_rgba(70,53,38,0.06)] transition hover:shadow-[0_14px_30px_rgba(70,53,38,0.1)]">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-brand-gold">Bakım</h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-700">
                Parfüm ve agresif kimyasallardan uzak tutun; yumuşak kuru bezle silerek saklayın. İlk günkü ışıltı
                uzun süre korunur.
              </p>
            </div>
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#e6dccf] bg-[#faf7f3] p-6 transition hover:shadow-[0_12px_24px_rgba(70,53,38,0.08)]">
              <h3 className="text-sm font-semibold text-stone-900">Kargo</h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                Siparişler cumartesi ve pazar hariç 1 iş günü içinde DHL Kargo&apos;ya teslim edilir. Gönderimler
                yalnızca Türkiye içindedir.
              </p>
            </div>
            <div className="rounded-2xl border border-[#e6dccf] bg-[#faf7f3] p-6 transition hover:shadow-[0_12px_24px_rgba(70,53,38,0.08)]">
              <h3 className="text-sm font-semibold text-stone-900">İade</h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                Teslimattan itibaren 14 gün içinde iade talebi oluşturabilirsin. İade kargo ücreti Zelula
                tarafından karşılanır.
              </p>
            </div>
          </section>
        </section>
      </div>

      <RelatedProducts currentProductId={product.id} />

      <div className="fixed inset-x-0 bottom-3 z-30 mx-auto w-[calc(100%-1rem)] max-w-md rounded-2xl border border-brand-gold/25 bg-[#fffdfb]/95 p-3 shadow-[0_12px_32px_rgba(45,37,33,0.14)] backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-stone-500">Toplam</p>
            <p className="text-lg font-semibold text-brand-gold">{formatTry(priceNum)}</p>
            <p className="text-[11px] text-stone-500">{stockQty > 0 ? (isLowStock ? `Son ${stockQty} ürün` : "Stokta var") : "Stokta yok"}</p>
          </div>
          <div className="min-w-[9.5rem] shrink-0">
            <AddToCartButton
              productId={product.id}
              productName={product.name}
              price={priceNum}
              category={product.category?.name}
              collection={product.collection?.name ?? null}
              stock={product.stock_quantity}
              tone="luxury"
              label="Şimdi satın al"
              secondaryLabel="🛒 Stiline Ekle"
              redirectAfterAdd="/sepet"
              productSlug={product.slug}
              className="!space-y-2 [&_button]:!py-3 [&_button]:text-xs"
            />
          </div>
        </div>
      </div>
     </ProductVariantProvider>
    </main>
  );
}

async function RelatedProducts({ currentProductId }: { currentProductId: string }) {
  const { products } = await getProducts({ sort: "featured" });
  const list = products.filter((p) => p.id !== currentProductId).slice(0, 4);
  if (list.length === 0) return null;
  return <RelatedProductsCarousel items={list} />;
}
