"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";

type Img = { id: string; image_url: string; is_cover?: boolean | null; sort_order?: number | null };

function isLikelyImageUrl(v: string): boolean {
  return /^https?:\/\/.+/i.test(v.trim());
}

function isLikelyVideoUrl(v: string): boolean {
  const raw = v.trim().toLowerCase();
  if (!raw) return false;
  const withoutQuery = raw.split("?")[0]?.split("#")[0] ?? raw;
  return [".mp4", ".webm", ".mov", ".m4v", ".ogg"].some((ext) => withoutQuery.endsWith(ext));
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="6" y="10" width="36" height="28" rx="3" className="stroke-current" strokeWidth="1.25" opacity="0.35" />
      <path
        d="M6 32l10-10 8 8 8-8 10 10"
        className="stroke-current"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />
      <circle cx="17" cy="18" r="2.5" className="fill-current" opacity="0.3" />
    </svg>
  );
}

function sortImages(images: Img[]): Img[] {
  const list = images.filter((x) => x && typeof x.image_url === "string" && x.image_url.trim().length > 0);
  return [...list].sort((a, b) => {
    const ac = a.is_cover ? 1 : 0;
    const bc = b.is_cover ? 1 : 0;
    if (ac !== bc) return bc - ac;
    return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
  });
}

export function ProductImageManager({
  title = "Görseller",
  images,
  productId,
  returnTo,
  uploadFormId,
  uploadProductImageAction,
  deleteProductImageAction,
}: {
  title?: string;
  images: Img[];
  productId?: string;
  returnTo?: string;
  uploadFormId?: string;
  uploadProductImageAction?: (formData: FormData) => Promise<void>;
  deleteProductImageAction?: (formData: FormData) => Promise<void>;
}) {
  const [selectedUrl, setSelectedUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadEnabled = Boolean(productId && uploadProductImageAction);
  const useExternalUploadForm = Boolean(uploadFormId && uploadEnabled);
  const sortedImages = useMemo(() => sortImages(images), [images]);
  const selectedPreview = isLikelyImageUrl(selectedUrl) ? selectedUrl.trim() : (sortedImages[0]?.image_url ?? "");
  const selectedPreviewIsVideo = isLikelyVideoUrl(selectedPreview);
  const noImageExists = sortedImages.length === 0;
  const canDelete = Boolean(productId && deleteProductImageAction);

  const submitFiles = (files: FileList | null) => {
    if (!uploadEnabled || !files?.length || !fileInputRef.current) return;
    const input = fileInputRef.current;
    const dt = new DataTransfer();
    for (let i = 0; i < files.length; i++) dt.items.add(files[i]);
    input.files = dt.files;
    if (useExternalUploadForm && uploadFormId) {
      const el = document.getElementById(uploadFormId);
      if (el instanceof HTMLFormElement) el.requestSubmit();
    }
    setTimeout(() => {
      input.value = "";
    }, 0);
  };

  return (
    <section
      id="product-section-images"
      className="scroll-mt-24 rounded-2xl border border-stone-200/50 bg-white/95 p-4 shadow-[0_2px_12px_-4px_rgba(28,25,23,0.06)] sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight text-stone-900">{title}</h2>
          <p className="mt-0.5 text-[10px] leading-relaxed text-stone-500">
            İlk sıradaki görsel kapaktır. Sürükleyip bırakın veya dosya seçin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {useExternalUploadForm ? (
            <>
              <input type="hidden" name="product_id" form={uploadFormId} value={productId ?? ""} />
              <input type="hidden" name="return_to" form={uploadFormId} value={returnTo ?? ""} />
            </>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            name="image"
            form={useExternalUploadForm ? uploadFormId : undefined}
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              submitFiles(e.currentTarget.files);
            }}
          />
          <button
            type="button"
            disabled={!uploadEnabled}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] rounded-lg border border-stone-300/90 bg-stone-900 px-3.5 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:py-1.5"
            title={uploadEnabled ? "Dosya seç" : "Önce ürünü kaydedin"}
          >
            Dosya seç
          </button>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-5",
          dragOver && "ring-2 ring-[#c9a06e]/40 ring-offset-2 rounded-xl",
        )}
        onDragOver={(e) => {
          if (!uploadEnabled) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!uploadEnabled) return;
          e.preventDefault();
          setDragOver(false);
          submitFiles(e.dataTransfer.files);
        }}
      >
        <div
          className={cn(
            "relative flex min-h-[180px] max-h-[min(38vh,360px)] flex-col overflow-hidden rounded-xl border border-stone-200/80 bg-gradient-to-b from-stone-50/90 to-stone-100/70",
            noImageExists && "min-h-[160px]",
          )}
        >
          {selectedPreview ? (
            selectedPreviewIsVideo ? (
              <video src={selectedPreview} controls playsInline className="h-full w-full object-contain" preload="metadata" />
            ) : (
              <div className="relative min-h-[180px] flex-1">
                <Image
                  src={selectedPreview}
                  alt="Önizleme"
                  fill
                  sizes="(max-width:1024px) 100vw, 560px"
                  className="object-contain p-2"
                  priority={false}
                />
              </div>
            )
          ) : (
            <button
              type="button"
              disabled={!uploadEnabled}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center transition hover:bg-white/40 disabled:opacity-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white/60 text-stone-400">
                <ImageIcon className="h-7 w-7" />
              </div>
              <p className="text-xs font-medium text-stone-600">Görsel bırakın veya tıklayın</p>
              <p className="max-w-[14rem] text-[10px] leading-snug text-stone-500">PNG, JPG veya video. Yüklemeden önce ürünü kaydedin.</p>
            </button>
          )}
        </div>

        <div className="flex w-full min-w-0 flex-col gap-1.5 lg:w-[11.5rem] lg:shrink-0">
          <p className="hidden text-[9px] font-semibold uppercase tracking-wide text-stone-400 lg:block">Küçük önizleme</p>
          {sortedImages.length > 0 ? (
            <p className="pl-0.5 text-[9px] text-stone-400 lg:hidden">Kaydırarak tüm görselleri görün</p>
          ) : null}
          <div
            className={cn(
              "flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-1.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] snap-x snap-mandatory lg:grid lg:max-h-none lg:grid-cols-2 lg:gap-2 lg:overflow-visible lg:pb-0 lg:snap-none",
              "[&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300/80",
            )}
          >
            {sortedImages.map((img, idx) => {
              const isCoverSlot = idx === 0;
              return (
                <div key={img.id} className="group relative w-[4.25rem] shrink-0 snap-start sm:w-[4.5rem] lg:w-full lg:shrink">
                  <button
                    type="button"
                    onClick={() => setSelectedUrl(img.image_url)}
                    className={cn(
                      "relative block h-14 w-full overflow-hidden rounded-lg border bg-white transition sm:h-16",
                      selectedPreview === img.image_url || (!selectedUrl && idx === 0)
                        ? "border-stone-800/40 ring-2 ring-stone-900/15"
                        : "border-stone-200/90 hover:border-stone-400",
                    )}
                    title={isLikelyVideoUrl(img.image_url) ? "Video" : "Seç"}
                  >
                    {isLikelyVideoUrl(img.image_url) ? (
                      <>
                        <video src={img.image_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/55 px-1 py-px text-[7px] font-medium text-white">
                          ▶
                        </span>
                      </>
                    ) : (
                      <Image src={img.image_url} alt="" fill sizes="72px" className="object-cover" />
                    )}
                    {isCoverSlot || img.is_cover ? (
                      <span className="absolute left-0.5 top-0.5 rounded bg-stone-900/90 px-1 py-px text-[7px] font-bold uppercase tracking-wide text-white">
                        Kapak
                      </span>
                    ) : null}
                  </button>
                  {canDelete ? (
                    <button
                      type="submit"
                      form={`zelula-delete-image-${img.id}`}
                      className="absolute -right-0.5 -top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-rose-700 shadow-md ring-1 ring-rose-200/90 opacity-90 transition hover:bg-rose-50 active:scale-95 lg:h-6 lg:w-6 lg:text-[10px] lg:opacity-0 lg:group-hover:opacity-100"
                      title="Sil"
                      aria-label="Görseli sil"
                      onClick={(e) => {
                        if (!window.confirm("Bu görseli silmek istiyor musunuz?")) {
                          e.preventDefault();
                        }
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              );
            })}
            {sortedImages.length === 0 ? null : (
              <button
                type="button"
                disabled={!uploadEnabled}
                onClick={() => fileInputRef.current?.click()}
                className="flex h-14 w-[4.25rem] shrink-0 snap-start items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50/80 text-lg font-light text-stone-400 transition hover:border-stone-400 hover:bg-white hover:text-stone-600 disabled:opacity-40 sm:h-16 sm:w-[4.5rem] lg:h-16 lg:w-full"
                title="Dosya ekle"
              >
                +
              </button>
            )}
          </div>
        </div>
      </div>
      {noImageExists ? (
        <p className="mt-2 text-[10px] text-stone-500">Yayın için en az bir görsel eklemeniz önerilir.</p>
      ) : null}
    </section>
  );
}
