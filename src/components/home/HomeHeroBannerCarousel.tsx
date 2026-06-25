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
  /** object-position; banner tasarımı tam görünsün diye varsayılan center */
  objectPosition?: string;
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
        {banners.map((banner, i) => (
          <article key={banner.id} className="relative min-w-full shrink-0">
            <div className="relative aspect-[1.75/1] w-full max-h-[min(920px,82dvh)]">
              <Image
                src={banner.imageSrc}
                alt={banner.alt}
                fill
                priority={i === 0}
                unoptimized
                className="object-contain"
                style={{ objectPosition: banner.objectPosition ?? "center center" }}
                sizes="100vw"
              />
              {banner.href ? (
                <Link
                  href={banner.href}
                  className="absolute inset-0 z-[1]"
                  aria-label={banner.alt}
                />
              ) : null}
            </div>
          </article>
        ))}
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
    </section>
  );
}
