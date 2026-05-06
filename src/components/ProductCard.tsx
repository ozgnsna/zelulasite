import Image from "next/image";
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
  initialFavorited = false,
  isSignedIn = false,
}: ProductCardProps) {
  const showBadges = Boolean(badges?.bestseller || badges?.new);
  const aspectClass =
    imageForward && imageEmphasis === "high"
      ? "aspect-[11/16] sm:aspect-[10/15] lg:aspect-[3/4]"
      : imageForward
        ? "aspect-[5/7] sm:aspect-[3/4]"
        : "aspect-[4/5]";
  const contentPad = imageForward ? "gap-1.5 p-4 sm:p-4" : "gap-2 p-5";
  const titleClass = imageForward
    ? "font-serif text-[1rem] leading-snug text-stone-900 sm:text-[1.05rem]"
    : "font-serif text-[1.12rem] leading-snug text-stone-900";
  const summaryClass = imageForward
    ? "mt-0.5 line-clamp-1 text-xs leading-relaxed text-stone-500"
    : "mt-1 line-clamp-2 text-sm leading-relaxed text-stone-500";

  const showPeek = Boolean(peekHint) && !conversionOverlay;

  return (
    <article
      className={cn(
        "group flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.35rem] border border-[#e6dccf] bg-[#fffdfb] shadow-[0_10px_28px_rgba(70,53,38,0.06)] transition-[transform,box-shadow,border-color] duration-200 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:border-[color:var(--brand-gold)]/35 motion-safe:hover:shadow-[0_20px_48px_rgba(55,48,40,0.1),0_0_0_1px_rgba(201,168,106,0.08)]",
        "zl-card",
        className,
      )}
    >
      <div className={`relative ${aspectClass} overflow-hidden bg-stone-100`}>
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={
            imageForward
              ? "object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.05]"
              : "object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.05]"
          }
        />
        <Link
          href={`/urunler/${slug}`}
          className="absolute inset-0 z-[1]"
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
            className="absolute right-2 top-2 z-[18] sm:right-2.5 sm:top-2.5"
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
            <div className="pointer-events-none absolute inset-0 z-[12] flex items-center justify-center opacity-0 transition-opacity duration-200 ease-out group-hover:pointer-events-auto group-hover:bg-black/[0.26] group-hover:opacity-100">
              <div className="pointer-events-auto translate-y-2 scale-[0.98] opacity-0 transition duration-200 ease-out group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
                <QuickAddButton
                  productId={id}
                  productName={name}
                  price={price}
                  category={category}
                  collection={collection}
                  productSlug={slug}
                  label="🛒 Stiline Ekle"
                  className="rounded-full border-0 bg-gradient-to-b from-stone-900 to-stone-950 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(15,12,10,0.35)] transition hover:from-[#3d3228] hover:to-brand-gold hover:shadow-[0_16px_36px_rgba(201,168,106,0.35)]"
                />
              </div>
            </div>
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
        <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <p className="zl-gold-text text-lg font-bold tabular-nums tracking-tight sm:text-xl">
                {formatMoney(price * 100, "TRY")}
              </p>
              {compareAtPrice ? (
                <span className="text-sm font-medium tabular-nums text-stone-400 line-through decoration-stone-300/90">
                  {formatMoney(compareAtPrice * 100, "TRY")}
                </span>
              ) : null}
            </div>
          </div>
          {id ? (
            <QuickAddButton
              productId={id}
              productName={name}
              price={price}
              category={category}
              collection={collection}
              productSlug={slug}
              label="🛒 Stiline Ekle"
              className={
                conversionOverlay
                  ? "border-brand-gold/35 bg-[#fffdfb] font-semibold shadow-sm motion-safe:hover:border-brand-gold/60"
                  : undefined
              }
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}
