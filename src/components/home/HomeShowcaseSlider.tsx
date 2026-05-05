"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type HomeShowcaseSlide = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string;
};

export function HomeShowcaseSlider({ slides }: { slides: HomeShowcaseSlide[] }) {
  const [index, setIndex] = useState(0);

  if (slides.length === 0) return null;

  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <section className="container-premium py-10 sm:py-12">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[#e7dfd2] bg-[#fcfaf7] shadow-[0_16px_36px_rgba(62,53,42,0.08)]">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide) => (
            <article key={slide.id} className="relative min-w-full">
              <div className="relative aspect-[16/8] w-full">
                <Image src={slide.imageUrl} alt={slide.title} fill className="object-cover object-center" sizes="100vw" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/18 to-transparent" aria-hidden />
              <div className="absolute inset-0 flex items-end p-6 sm:p-8">
                <div className="max-w-md text-white">
                  <h2 className="font-serif text-2xl font-light sm:text-3xl">{slide.title}</h2>
                  <p className="mt-2 text-sm text-white/90 sm:text-base">{slide.subtitle}</p>
                  <Link
                    href={slide.href}
                    className="mt-4 inline-flex rounded-full border border-white/35 bg-white/10 px-5 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white transition hover:bg-white/20"
                  >
                    İncele
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-white/20 p-2 text-white backdrop-blur-sm transition hover:bg-white/30"
              aria-label="Önceki slayt"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-white/20 p-2 text-white backdrop-blur-sm transition hover:bg-white/30"
              aria-label="Sonraki slayt"
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`${i + 1}. slayta git`}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/70"}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
