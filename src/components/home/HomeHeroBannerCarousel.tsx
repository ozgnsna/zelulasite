"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type HomeHeroBanner = {
  id: string;
  imageSrc: string;
  alt: string;
  href?: string;
};

const AUTO_MS = 7000;

export function HomeHeroBannerCarousel({ banners }: { banners: HomeHeroBanner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = banners.length;
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = window.setInterval(next, AUTO_MS);
    return () => window.clearInterval(t);
  }, [count, next, paused]);

  if (count === 0) return null;

  return (
    <section
      className="relative w-full overflow-hidden bg-[#1a1510]"
      aria-label="Zelula tanıtım bannerları"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {banners.map((banner, i) => {
          const slide = (
            <div className="relative aspect-[16/10] w-full min-h-[min(92svh,820px)] sm:aspect-[16/9] sm:min-h-[min(88svh,760px)]">
              <Image
                src={banner.imageSrc}
                alt={banner.alt}
                fill
                priority={i === 0}
                className="object-cover object-center"
                sizes="100vw"
              />
            </div>
          );

          return (
            <article key={banner.id} className="relative min-w-full shrink-0">
              {banner.href ? (
                <Link href={banner.href} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a06e]">
                  {slide}
                </Link>
              ) : (
                slide
              )}
            </article>
          );
        })}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/30 bg-black/25 p-2 text-white backdrop-blur-sm transition hover:bg-black/40 sm:left-5"
            aria-label="Önceki banner"
          >
            <ChevronLeft className="size-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/30 bg-black/25 p-2 text-white backdrop-blur-sm transition hover:bg-black/40 sm:right-5"
            aria-label="Sonraki banner"
          >
            <ChevronRight className="size-5" strokeWidth={1.75} />
          </button>
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 sm:bottom-6">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}. banner`}
                aria-current={i === index ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-7 bg-[#c9a06e]" : "w-2 bg-white/45 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </>
      ) : null}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#faf8f5] to-transparent sm:h-20" aria-hidden />
    </section>
  );
}
