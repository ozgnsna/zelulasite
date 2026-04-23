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
}: ProductCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-[#e6dccf] bg-[#fffdfb] shadow-[0_8px_24px_rgba(70,53,38,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(70,53,38,0.10)]">
      <Link href={`/urunler/${slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-700 group-hover:scale-[1.05]"
          />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <Link href={`/urunler/${slug}`} className="block">
          <h2 className="font-serif text-[1.12rem] leading-snug text-stone-900">{name}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-stone-500">{summary ?? "Zamansız form, modern dokunuş."}</p>
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Çok satan</p>
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
