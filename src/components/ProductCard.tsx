import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { QuickAddButton } from "@/components/QuickAddButton";

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
}: ProductCardProps) {
  const showBadges = Boolean(badges?.bestseller || badges?.new);
  /* imageForward: daha uzun görsel (yükseklik / genişlik) — metin alanı küçülür */
  const aspectClass = imageForward ? "aspect-[3/4] sm:aspect-[10/13]" : "aspect-[4/5]";
  const contentPad = imageForward ? "gap-1.5 p-4 sm:p-4" : "gap-2 p-5";
  const titleClass = imageForward
    ? "font-serif text-[1rem] leading-snug text-stone-900 sm:text-[1.05rem]"
    : "font-serif text-[1.12rem] leading-snug text-stone-900";
  const summaryClass = imageForward
    ? "mt-0.5 line-clamp-1 text-xs leading-relaxed text-stone-500"
    : "mt-1 line-clamp-2 text-sm leading-relaxed text-stone-500";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-[#e6dccf] bg-[#fffdfb] shadow-[0_8px_24px_rgba(70,53,38,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(70,53,38,0.10)]">
      <Link href={`/urunler/${slug}`} className="block">
        <div className={`relative ${aspectClass} overflow-hidden bg-stone-100`}>
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-700 group-hover:scale-[1.05]"
          />
          {showBadges ? (
            <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex max-w-[calc(100%-1.25rem)] flex-wrap gap-1.5 sm:left-3 sm:top-3">
              {badges?.bestseller ? (
                <span className="rounded-md bg-stone-950/92 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur-[2px] sm:text-[10px]">
                  Çok Satan
                </span>
              ) : null}
              {badges?.new ? (
                <span className="rounded-md border border-white/70 bg-[#fffdfb]/95 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-900 shadow-sm backdrop-blur-[2px] sm:text-[10px]">
                  Yeni
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>
      <div className={`flex flex-1 flex-col ${contentPad}`}>
        <Link href={`/urunler/${slug}`} className="block min-w-0">
          <h2 className={titleClass}>{name}</h2>
          <p className={summaryClass}>{summary ?? "Zamansız form, modern dokunuş."}</p>
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div>
            <div className="flex items-center gap-2">
              {compareAtPrice ? (
                <span className="text-xs tracking-wide text-stone-400 line-through">{formatMoney(compareAtPrice * 100, "TRY")}</span>
              ) : null}
              <p className="text-sm font-semibold tracking-wide text-stone-800">{formatMoney(price * 100, "TRY")}</p>
            </div>
          </div>
          {id ? (
            <QuickAddButton
              productId={id}
              productName={name}
              price={price}
              category={category}
              collection={collection}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}
