import { ProductImage } from "@/components/product/ProductImage";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { QuickAddButton } from "@/components/QuickAddButton";
import { ProductFavoriteButton } from "@/components/ProductFavoriteButton";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  id?: string;
  slug: string;
  name: string;
  summary?: string;
  imageUrl: string;
  price: number;
  compareAtPrice?: number | null;
  category?: string;
  collection?: string | null;
  /** Rozetler görsel üzerinde; yalnızca true olanlar gösterilir */
  badges?: { bestseller?: boolean; new?: boolean };
  /** Görseli büyütür, metin alanını sıkılaştırır (ör. ana sayfa çok satanlar) */
  imageForward?: boolean;
  /** Ana sayfa çok satanlar: görsel alanı daha baskın */
  imageEmphasis?: "default" | "high";
  /** Görsel üzerinde hover’da kısa CTA (örn. Hemen incele) */
  peekHint?: string;
  /** Ana sayfa: hover’da sepete ekle katmanı */
  conversionOverlay?: boolean;
  /** Kart kökü (ör. yatay şerit genişliği) */
  className?: string;
  /** Kategori listelerinde mobil 2 sütun — daha sıkı kart */
  density?: "default" | "compact";
  /** Girişli kullanıcı favori durumu (liste sayfaları sunucudan doldurur) */
  initialFavorited?: boolean;
  isSignedIn?: boolean;
};

export function ProductCard({
  id,
  slug,
  name,
  summary,
  imageUrl,
  price,
  compareAtPrice,
  category,
  collection,
  badges,
  imageForward = false,
  imageEmphasis = "default",
  peekHint,
  conversionOverlay = false,
  className,
  density = "default",
  initialFavorited = false,
  isSignedIn = false,
}: ProductCardProps) {
  const compact = density === "compact";
  const showBadges = Boolean(badges?.bestseller || badges?.new);
  const aspectClass =
    imageForward && imageEmphasis === "high"
      ? "aspect-[11/16] sm:aspect-[10/15] lg:aspect-[3/4]"
      : imageForward
        ? "aspect-[5/7] sm:aspect-[3/4]"
        : compact
          ? "aspect-[4/5] sm:aspect-[4/5]"
          : "aspect-[4/5]";
  const contentPad = compact
    ? "gap-1 p-2.5 sm:gap-2 sm:p-5"
    : imageForward
      ? "gap-1.5 p-4 sm:p-4"
      : "gap-2 p-5";
  const titleClass = compact
    ? "line-clamp-2 font-serif text-[0.8125rem] leading-snug text-stone-900 sm:line-clamp-none sm:text-[1.12rem]"
    : imageForward
      ? "font-serif text-[1rem] leading-snug text-stone-900 sm:text-[1.05rem]"
      : "font-serif text-[1.12rem] leading-snug text-stone-900";
  const summaryClass = compact
    ? "mt-0.5 hidden text-sm leading-relaxed text-stone-500 sm:line-clamp-2 sm:block"
    : imageForward
      ? "mt-0.5 line-clamp-1 text-xs leading-relaxed text-stone-500"
      : "mt-1 line-clamp-2 text-sm leading-relaxed text-stone-500";
  const imageSizes = compact
    ? "(max-width: 640px) 46vw, (max-width: 1024px) 50vw, 33vw"
    : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
  const cardRadius = compact ? "rounded-xl sm:rounded-[1.35rem]" : "rounded-[1.35rem]";

  const showPeek = Boolean(peekHint) && !conversionOverlay;

  return (
    <article
      className={cn(
        "group flex h-full cursor-pointer flex-col overflow-hidden border border-[#e6dccf] bg-[#fffdfb] shadow-[0_10px_28px_rgba(70,53,38,0.06)] transition-[transform,box-shadow,border-color] duration-200 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:border-[color:var(--brand-gold)]/35 motion-safe:hover:shadow-[0_20px_48px_rgba(55,48,40,0.1),0_0_0_1px_rgba(201,168,106,0.08)]",
        cardRadius,
        "zl-card",
        className,
      )}
    >
      <div className={`relative ${aspectClass} overflow-hidden bg-white`}>
        <ProductImage
          src={imageUrl}
          alt={name}
          fill
          sizes={imageSizes}
          className={
            imageForward
              ? "object-contain p-2 transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.05]"
              : "object-contain p-2 transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.05]"
          }
        />
        <Link
          href={`/urunler/${slug}`}
          className="absolute inset-0 z-[2]"
          aria-label={`${name} — ürünü aç`}
        >
          <span className="sr-only">{name}</span>
        </Link>
        {id ? (
          <ProductFavoriteButton
            key={`fav-${id}-${initialFavorited ? "1" : "0"}`}
            productId={id}
            productSlug={slug}
            initialFavorited={initialFavorited}
            isSignedIn={isSignedIn}
            className={cn(
              "absolute right-2 top-2 z-[18] sm:right-2.5 sm:top-2.5",
              compact && "right-1.5 top-1.5 scale-90 sm:scale-100 sm:right-2.5 sm:top-2.5",
            )}
          />
        ) : null}
        {showPeek ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] flex justify-center bg-gradient-to-t from-black/35 via-black/10 to-transparent pb-3 pt-10 opacity-0 transition duration-300 ease-out group-hover:opacity-100">
              <span className="rounded-full border border-brand-gold/30 bg-[#fffdfb]/95 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-800 shadow-md backdrop-blur-sm">
                {peekHint}
              </span>
            </div>
          ) : null}
          {conversionOverlay && id ? (
            <>
              {/* Masaüstü: yalnızca hover’da sepete ekle — kart tıklaması ürüne gider */}
              <div className="pointer-events-none absolute inset-0 z-[12] hidden items-center justify-center bg-black/[0.26] opacity-0 transition-opacity duration-200 ease-out lg:flex lg:group-hover:opacity-100">
                <div className="pointer-events-none translate-y-2 scale-[0.98] opacity-0 transition duration-200 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
                  <QuickAddButton
                    productId={id}
                    productName={name}
                    price={price}
                    category={category}
                    collection={collection}
                    productSlug={slug}
                    isolateClick
                    label="Sepete ekle"
                    className="rounded-full border-0 bg-gradient-to-b from-stone-900 to-stone-950 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(15,12,10,0.35)] transition hover:from-[#3d3228] hover:to-brand-gold hover:shadow-[0_16px_36px_rgba(201,168,106,0.35)]"
                  />
                </div>
              </div>
              {/* Dokunmatik: küçük sepet ikonu — yanlışlıkla basmayı zorlaştırır */}
              <div className="pointer-events-none absolute bottom-2 right-2 z-[18] lg:hidden">
                <QuickAddButton
                  productId={id}
                  productName={name}
                  price={price}
                  category={category}
                  collection={collection}
                  productSlug={slug}
                  variant="icon"
                  isolateClick
                  className="pointer-events-auto"
                />
              </div>
            </>
          ) : null}
          {showBadges ? (
            <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex max-w-[calc(100%-1.25rem)] flex-wrap gap-1.5 sm:left-3 sm:top-3">
              {badges?.bestseller ? (
                <span
                  className={cn(
                    "rounded-md border border-brand-gold/50 bg-gradient-to-b from-stone-900 to-stone-800 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#fdf6e9] shadow-sm backdrop-blur-[2px] sm:text-[10px]",
                    "animate-bestseller-pulse",
                  )}
                >
                  Çok Satan
                </span>
              ) : null}
              {badges?.new ? (
                <span className="rounded-md border border-brand-gold/35 bg-brand-rose/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-800 shadow-sm backdrop-blur-[2px] sm:text-[10px]">
                  Yeni
                </span>
              ) : null}
            </div>
          ) : null}
      </div>
      <div className={`flex flex-1 flex-col ${contentPad}`}>
        <Link href={`/urunler/${slug}`} className="block min-w-0">
          <h2 className={titleClass}>{name}</h2>
          <p className={summaryClass}>{summary ?? "Zamansız form, modern dokunuş."}</p>
        </Link>
        <div className={`mt-auto flex items-end justify-between gap-2 pt-1.5 sm:gap-3 sm:pt-2 ${compact ? "flex-col items-stretch sm:flex-row sm:items-end" : ""}`}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p
                className={cn(
                  "zl-gold-text font-bold tabular-nums tracking-tight",
                  compact ? "text-sm sm:text-xl" : "text-lg sm:text-xl",
                )}
              >
                {formatMoney(price * 100, "TRY")}
              </p>
              {compareAtPrice ? (
                <span className="text-sm font-medium tabular-nums text-stone-400 line-through decoration-stone-300/90">
                  {formatMoney(compareAtPrice * 100, "TRY")}
                </span>
              ) : null}
            </div>
          </div>
          <Link
            href={`/urunler/${slug}`}
            className={cn(
              "shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9a7848] underline-offset-2 transition hover:text-[#7d5f35] hover:underline",
              compact && "hidden sm:inline",
            )}
          >
            İncele
          </Link>
        </div>
      </div>
    </article>
  );
}
