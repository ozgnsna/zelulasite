"use client";

import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type LightboxImage = { id: string; image_url: string };

type Props = {
  images: LightboxImage[];
  initialIndex: number;
  alt: string;
  open: boolean;
  onClose: () => void;
};

function normalizeLightboxSrc(url: string): string {
  return String(url ?? "").trim();
}

function isRenderableSrc(url: string): boolean {
  if (!url) return false;
  return (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("/") ||
    url.startsWith("data:image/")
  );
}

export function ProductImageLightbox({ images, initialIndex, alt, open, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      setLoadError(false);
    }
  }, [open, initialIndex]);

  const go = useCallback(
    (delta: number) => {
      if (images.length <= 1) return;
      setIndex((i) => (i + delta + images.length) % images.length);
      setLoadError(false);
    },
    [images.length],
  );

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, go]);

  if (!open || !mounted || images.length === 0) return null;

  const current = images[index] ?? images[0]!;
  const src = normalizeLightboxSrc(current.image_url);
  const srcOk = isRenderableSrc(src);

  const overlay = (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — büyük görünüm`}
      onClick={onClose}
    >
      <div className="relative flex min-h-0 flex-1 flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {images.length > 1 ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">
              {index + 1} / {images.length}
            </p>
          ) : (
            <span className="text-[11px] text-white/50">Tam ekran</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Kapat"
          >
            <X className="size-5" strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-8 pt-2 sm:px-10">
          <div className="flex max-h-[82vh] max-w-[min(94vw,880px)] items-center justify-center rounded-lg bg-white p-2 shadow-2xl">
            {!srcOk || loadError ? (
              <p className="px-6 py-12 text-center text-sm text-stone-600">
                Görsel yüklenemedi. Sayfayı yenileyip tekrar deneyin.
              </p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- lightbox: portal + doğrudan URL; fill/Image viewport sorunları yok
              <img
                key={src}
                src={src}
                alt={alt}
                draggable={false}
                decoding="async"
                className="max-h-[min(78vh,820px)] w-auto max-w-full object-contain"
                onError={() => setLoadError(true)}
              />
            )}
          </div>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute left-2 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white transition hover:bg-black/70 sm:left-5"
                aria-label="Önceki görsel"
              >
                <ChevronLeft className="size-6" strokeWidth={1.5} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="absolute right-2 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white transition hover:bg-black/70 sm:right-5"
                aria-label="Sonraki görsel"
              >
                <ChevronRight className="size-6" strokeWidth={1.5} aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

type OpenLightboxTriggerProps = {
  onOpen: () => void;
  className?: string;
  showLabel?: boolean;
};

/** Ana görsel üzerinde tıklanabilir büyütme katmanı */
export function ProductGalleryZoomTrigger({ onOpen, className, showLabel = true }: OpenLightboxTriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "absolute inset-0 z-[2] flex cursor-zoom-in items-end justify-end p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        className,
      )}
      aria-label="Görseli büyüt"
    >
      <span className="flex items-center gap-1 rounded-full border border-[#e8dfd3]/90 bg-white/95 px-2.5 py-1 text-[10px] font-medium text-stone-700 shadow-sm opacity-90 transition group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        <ZoomIn className="size-3.5 shrink-0 text-stone-600" strokeWidth={1.75} aria-hidden />
        {showLabel ? <span>Büyüt</span> : null}
      </span>
    </button>
  );
}
