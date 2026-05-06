"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { MouseEventHandler, WheelEventHandler } from "react";
import { QuickAddButton } from "@/components/QuickAddButton";
import { formatTry } from "@/lib/money";

type RelatedItem = {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  price: number;
  compare_at_price: number | null;
  product_images?: { id: string; image_url: string; is_cover: boolean }[];
  category?: { name: string } | null;
  collection?: { name: string } | null;
};

export function RelatedProductsCarousel({ items }: { items: RelatedItem[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);

  const scrollByAmount = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  const handleMouseDown: MouseEventHandler<HTMLDivElement> = (e) => {
    const node = scrollerRef.current;
    if (!node) return;
    draggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartScrollRef.current = node.scrollLeft;
  };

  const handleMouseMove: MouseEventHandler<HTMLDivElement> = (e) => {
    const node = scrollerRef.current;
    if (!node || !draggingRef.current) return;
    const delta = e.clientX - dragStartXRef.current;
    node.scrollLeft = dragStartScrollRef.current - delta;
  };

  const handleMouseUp = () => {
    draggingRef.current = false;
  };

  const handleWheel: WheelEventHandler<HTMLDivElement> = (e) => {
    const node = scrollerRef.current;
    if (!node) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      node.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  return (
    <section className="mt-16 border-t border-brand-gold/15 pt-12">
      <h2 className="section-title font-light text-stone-900">Bunu alanlar şunları da aldı</h2>
      <p className="mt-2 text-sm font-light text-stone-600">Tarzını tamamlamak için öneriler</p>

      <div className="relative mt-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#f7f4ef] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#f7f4ef] to-transparent" />

        <button
          type="button"
          onClick={() => scrollByAmount(-250)}
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[#e8dfd2] bg-white/95 p-2 text-stone-700 shadow-[0_8px_18px_rgba(62,52,38,0.14)] transition hover:bg-white hover:shadow-[0_10px_24px_rgba(62,52,38,0.22)]"
          aria-label="Önceki ürünler"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollByAmount(250)}
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[#e8dfd2] bg-white/95 p-2 text-stone-700 shadow-[0_8px_18px_rgba(62,52,38,0.14)] transition hover:bg-white hover:shadow-[0_10px_24px_rgba(62,52,38,0.22)]"
          aria-label="Sonraki ürünler"
        >
          <ChevronRight className="size-4" />
        </button>

        <div
          ref={scrollerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full cursor-grab select-none overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex min-w-max gap-4 py-1 sm:gap-5">
            {items.map((item) => (
              <article
                key={item.id}
                className="w-[140px] shrink-0 rounded-2xl border border-[#e8dfd2] bg-white/95 shadow-[0_8px_18px_rgba(62,52,38,0.06)] transition hover:scale-[1.02] hover:shadow-[0_12px_24px_rgba(62,52,38,0.12)] sm:w-[180px] lg:w-[200px]"
              >
                <Link href={`/urunler/${item.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-t-2xl bg-stone-100">
                  <Image
                    src={item.product_images?.[0]?.image_url ?? "https://picsum.photos/id/99/900/900"}
                    alt={item.name}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                </Link>
                <div className="space-y-2 p-3">
                  <Link href={`/urunler/${item.slug}`} className="line-clamp-2 text-xs font-medium leading-snug text-stone-900 hover:underline sm:text-sm">
                    {item.name}
                  </Link>
                  <p className="text-sm font-semibold text-[#7d5f35]">{formatTry(Number(item.price))}</p>
                  <QuickAddButton
                    productId={item.id}
                    productName={item.name}
                    price={Number(item.price)}
                    category={item.category?.name}
                    collection={item.collection?.name ?? null}
                    productSlug={item.slug}
                    label="🛒 Stiline Ekle"
                    successMessage="Sepete eklendi ✨"
                    className="w-full rounded-full border-[#dccdb8] bg-[#fdfbf8] py-2 text-[11px] font-medium text-stone-800 transition hover:border-[#c6a15b]/60 hover:bg-[#f9f1e4] hover:shadow-[0_8px_18px_rgba(198,161,91,0.18)]"
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
