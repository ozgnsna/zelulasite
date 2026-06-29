"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type HomeHeroBanner = {
  id: string;
  imageSrc: string;
  width: number;
  height: number;
  alt: string;
  href?: string;
  /** object-position; metin solda olduğu için varsayılan left center */
  objectPosition?: string;
};

const AUTO_MS = 7000;
/** Banner tasarımları ~1.75:1; cover + sol hizalı — sağda boşluk kalmaz, yazı okunur. */
const SLIDE_ASPECT = "7 / 4";

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

  const active = banners[index]!;

  return (
    <section className="bg-[#faf8f5] px-4 pt-4 sm:px-6 sm:pt-5" aria-label="Zelula tanıtım bannerları">
      <div
        className="relative mx-auto w-full max-w-[1100px] overflow-hidden rounded-2xl border border-[#e8dfd3]/70 bg-[#faf8f5] shadow-[0_8px_32px_-12px_rgba(45,37,33,0.12)] sm:rounded-[1.35rem]"
        style={{ aspectRatio: SLIDE_ASPECT, width: "100%" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <article key={active.id} className="relative h-full w-full">
          <div className="relative h-full w-full">
            <Image
              src={active.imageSrc}
              alt={active.alt}
              width={active.width}
              height={active.height}
              priority={index === 0}
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "low"}
              className="h-full w-full object-cover object-left"
              style={{ objectPosition: active.objectPosition ?? "left center" }}
              sizes="(max-width: 1100px) 100vw, 1100px"
            />
            {active.href ? (
              <Link
                href={active.href}
                className="absolute inset-0 z-[1]"
                aria-label={active.alt}
              />
            ) : null}
          </div>
        </article>

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 touch-target rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40 sm:left-5"
              aria-label="Önceki banner"
            >
              <ChevronLeft className="size-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 touch-target rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40 sm:right-5"
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
                  className="touch-target rounded-full"
                >
                  <span
                    aria-hidden
                    className={`block rounded-full transition-all ${i === index ? "h-1.5 w-7 bg-[#c9a06e]" : "h-1.5 w-2 bg-white/70"}`}
                  />
                </button>
              ))}
            </div>
          </>
        ) : null}

        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-[2] h-12 bg-gradient-to-t from-[#faf8f5] to-transparent sm:h-14"
          aria-hidden
        />
      </div>
    </section>
  );
}
