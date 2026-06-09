"use client";

import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

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

  // Zoom + pan: ref'ler kaynak (anlık), render için tick.
  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const boxRef = useRef<HTMLDivElement>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDist = useRef<number | null>(null);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const applyTransform = useCallback((s: number, x: number, y: number) => {
    scaleRef.current = s;
    txRef.current = x;
    tyRef.current = y;
    forceRender();
  }, []);

  const resetZoom = useCallback(() => {
    pointers.current.clear();
    pinchDist.current = null;
    panStart.current = null;
    applyTransform(1, 0, 0);
  }, [applyTransform]);

  const zoomAround = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const box = boxRef.current;
      if (!box) return;
      const prev = scaleRef.current;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor));
      if (next === prev) return;
      if (next === MIN_SCALE) {
        applyTransform(MIN_SCALE, 0, 0);
        return;
      }
      const r = box.getBoundingClientRect();
      const px = clientX - (r.left + r.width / 2);
      const py = clientY - (r.top + r.height / 2);
      const ratio = next / prev;
      applyTransform(next, px - (px - txRef.current) * ratio, py - (py - tyRef.current) * ratio);
    },
    [applyTransform],
  );

  const zoomFromButton = useCallback(
    (factor: number) => {
      const box = boxRef.current;
      if (!box) return;
      const r = box.getBoundingClientRect();
      zoomAround(r.left + r.width / 2, r.top + r.height / 2, factor);
    },
    [zoomAround],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      setLoadError(false);
      resetZoom();
    }
  }, [open, initialIndex, resetZoom]);

  const go = useCallback(
    (delta: number) => {
      if (images.length <= 1) return;
      setIndex((i) => (i + delta + images.length) % images.length);
      setLoadError(false);
      resetZoom();
    },
    [images.length, resetZoom],
  );

  // Masaüstü: fare tekerleğiyle yakınlaştır (passive olmayan dinleyici şart).
  useEffect(() => {
    if (!open) return;
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAround(e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 1 / 1.18);
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, [open, mounted, index, zoomAround]);

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

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* yoksay */
    }
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      pinchDist.current = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      panStart.current = null;
    } else if (pointers.current.size === 1 && scaleRef.current > 1) {
      panStart.current = { x: e.clientX, y: e.clientY, tx: txRef.current, ty: tyRef.current };
    }
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pointers.current.values()];
      if (pts.length >= 2 && pinchDist.current != null) {
        const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
        if (pinchDist.current > 0) {
          zoomAround((pts[0]!.x + pts[1]!.x) / 2, (pts[0]!.y + pts[1]!.y) / 2, dist / pinchDist.current);
        }
        pinchDist.current = dist;
      } else if (pts.length === 1 && panStart.current) {
        const p = panStart.current;
        applyTransform(scaleRef.current, p.tx + (e.clientX - p.x), p.ty + (e.clientY - p.y));
      }
    },
    [applyTransform, zoomAround],
  );

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = null;
    if (pointers.current.size === 0) panStart.current = null;
  }, []);

  const onDoubleClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (scaleRef.current > 1) resetZoom();
      else zoomAround(e.clientX, e.clientY, 2.5);
    },
    [resetZoom, zoomAround],
  );

  if (!open || !mounted || images.length === 0) return null;

  const current = images[index] ?? images[0]!;
  const src = normalizeLightboxSrc(current.image_url);
  const srcOk = isRenderableSrc(src);
  const zoomed = scaleRef.current > 1;
  const interacting = pointers.current.size > 0;

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => zoomFromButton(1 / 1.4)}
              className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
              aria-label="Uzaklaştır"
              disabled={!zoomed}
            >
              <ZoomOut className="size-5" strokeWidth={1.5} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => zoomFromButton(1.4)}
              className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Yakınlaştır"
            >
              <ZoomIn className="size-5" strokeWidth={1.5} aria-hidden />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Kapat"
            >
              <X className="size-5" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-8 pt-2 sm:px-10">
          <div
            ref={boxRef}
            className="relative flex max-h-[82vh] max-w-[min(94vw,880px)] select-none items-center justify-center overflow-hidden rounded-lg bg-white p-2 shadow-2xl"
            style={{
              touchAction: "none",
              cursor: !srcOk || loadError ? "default" : zoomed ? "grab" : "zoom-in",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={onDoubleClick}
          >
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
                style={{
                  transform: `translate(${txRef.current}px, ${tyRef.current}px) scale(${scaleRef.current})`,
                  transition: interacting ? "none" : "transform 140ms ease-out",
                  willChange: "transform",
                }}
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
