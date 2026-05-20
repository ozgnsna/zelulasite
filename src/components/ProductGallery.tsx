"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { ProductGalleryZoomTrigger, ProductImageLightbox } from "@/components/product/ProductImageLightbox";
import { normalizeProductImages, sortProductImages } from "@/lib/products/cover-image";

type Img = { id: string; image_url: string; is_cover?: boolean | null; sort_order?: number | null };

function dedupeByUrl(items: Img[]): Img[] {
  const seen = new Set<string>();
  return items.filter((img) => {
    if (!img.image_url || seen.has(img.image_url)) return false;
    seen.add(img.image_url);
    return true;
  });
}

export function ProductGallery({
  images,
  extraImages = [],
  fallback,
  alt,
  loopVideoUrl,
}: {
  images: Img[];
  extraImages?: Img[];
  fallback: string;
  alt: string;
  /** Varsa ana görsel üzerinde sessiz döngü video (örn. .mp4 URL) */
  loopVideoUrl?: string | null;
}) {
  const list = useMemo(() => {
    const normalized = normalizeProductImages(images);
    const base = normalized.length
      ? sortProductImages(normalized)
      : [{ id: "fallback", image_url: fallback }];
    const merged = dedupeByUrl([...base, ...normalizeProductImages(extraImages)]);
    return merged.length ? merged : [{ id: "fallback", image_url: fallback }];
  }, [images, extraImages, fallback]);

  const [active, setActive] = useState(() => list[0]?.image_url ?? fallback);
  const [videoFailed, setVideoFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    const first = list[0]?.image_url ?? fallback;
    setActive((prev) => (list.some((item) => item.image_url === prev) ? prev : first));
  }, [list, fallback]);

  const mainSrc = list.some((i) => i.image_url === active) ? active : (list[0]?.image_url ?? fallback);
  const firstUrl = list[0]?.image_url ?? fallback;
  const showVideo = Boolean(loopVideoUrl?.trim()) && !videoFailed && mainSrc === firstUrl;
  const resolvedActiveIndex = Math.max(0, list.findIndex((i) => i.image_url === mainSrc));

  const onVideoError = useCallback(() => setVideoFailed(true), []);
  const openLightbox = useCallback(() => setLightboxOpen(true), []);

  return (
    <div className="space-y-4">
      <div className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-[#e8dfd3] bg-white shadow-[0_16px_40px_rgba(70,53,38,0.08)] transition duration-200 hover:border-[#d8ccb9] hover:shadow-[0_20px_48px_rgba(70,53,38,0.1)]">
        <div key={mainSrc} className="gallery-main-fade absolute inset-0">
          <Image
            src={mainSrc}
            alt={alt}
            fill
            priority
            className="object-contain p-3 transition duration-[680ms] ease-out motion-safe:group-hover:scale-[1.02] sm:p-4"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        {showVideo ? (
          <video
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.88] mix-blend-normal"
            poster={mainSrc}
            muted
            playsInline
            autoPlay
            loop
            preload="metadata"
            aria-hidden
            onError={onVideoError}
          >
            <source src={loopVideoUrl!.trim()} type="video/mp4" />
          </video>
        ) : null}

        {/* Subtle jewelry shine */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl motion-reduce:hidden"
          aria-hidden
        >
          <div className="absolute -inset-[20%] rotate-12 bg-gradient-to-tr from-transparent via-white/[0.14] to-transparent opacity-0 blur-2xl transition duration-[1.1s] ease-out motion-safe:group-hover:translate-x-[18%] motion-safe:group-hover:opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-[color:var(--brand-gold)]/[0.06]" />
        </div>

        {!showVideo ? <ProductGalleryZoomTrigger onOpen={openLightbox} /> : null}
      </div>

      <ProductImageLightbox
        images={list}
        initialIndex={resolvedActiveIndex}
        alt={alt}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
      {list.length > 1 ? (
        <div className="space-y-2">
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
            {list.findIndex((i) => i.image_url === mainSrc) + 1} / {list.length}
          </p>
          <div
            className="flex gap-2.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:gap-3 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300/80"
            role="tablist"
            aria-label="Ürün görselleri"
          >
            {list.map((img, index) => {
              const isOn = mainSrc === img.image_url;
              return (
                <button
                  key={`${img.id}-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={isOn}
                  aria-label={`Görsel ${index + 1}`}
                  onClick={() => setActive(img.image_url)}
                  className={`relative aspect-square w-[72px] shrink-0 overflow-hidden rounded-2xl border-2 transition duration-200 motion-safe:hover:scale-[1.03] sm:w-[84px] ${
                    isOn
                      ? "border-brand-gold bg-white shadow-[0_0_0_1px_rgba(201,168,106,0.35)] ring-2 ring-brand-gold/30"
                      : "border-[#e6dccf] bg-white hover:border-brand-gold/35"
                  }`}
                >
                  <Image
                    src={img.image_url}
                    alt=""
                    fill
                    unoptimized={img.image_url.includes("/storage/v1/object/public/")}
                    className="object-contain bg-white p-0.5"
                    sizes="120px"
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
