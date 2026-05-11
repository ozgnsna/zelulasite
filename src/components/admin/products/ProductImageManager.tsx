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
  images,
  productId,
  returnTo,
  uploadFormId,
  uploadProductImageAction,
  deleteProductImageAction,
}: {
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
      className="scroll-mt-20 rounded-xl border border-stone-200/70 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-stone-900">Medya</h2>
          <p className="mt-0.5 text-[10px] text-stone-500">Kapak görseli listede önce gösterilir.</p>
        </div>
        <div className="flex items-center gap-2">
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
            className="rounded-lg border border-stone-200/90 bg-stone-50 px-3 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            title={uploadEnabled ? "Dosya seç" : "Önce ürünü kaydedin"}
          >
            Yükle
          </button>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-3 lg:grid-cols-[1fr_7.5rem] lg:gap-4",
          dragOver && "ring-2 ring-stone-300/80 ring-offset-2 rounded-lg",
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
            "relative flex min-h-[200px] max-h-[min(40vh,420px)] flex-col overflow-hidden rounded-lg border border-stone-200/80 bg-gradient-to-b from-stone-50 to-stone-100/80",
            noImageExists && "min-h-[180px]",
          )}
        >
          {selectedPreview ? (
            selectedPreviewIsVideo ? (
              <video src={selectedPreview} controls playsInline className="h-full w-full object-contain" preload="metadata" />
            ) : (
              <div className="relative min-h-[200px] flex-1">
                <Image
                  src={selectedPreview}
                  alt="Önizleme"
                  fill
                  sizes="(max-width:1024px) 100vw, 640px"
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

        <div className="flex flex-col gap-1.5 lg:max-h-[min(40vh,420px)] lg:overflow-y-auto">
          {sortedImages.map((img, idx) => (
            <div key={img.id} className={cn("group relative", idx === 0 && "lg:mb-1")}>
              <button
                type="button"
                onClick={() => setSelectedUrl(img.image_url)}
                className={cn(
                  "relative aspect-square w-full overflow-hidden rounded-md border bg-white transition",
                  selectedPreview === img.image_url || (!selectedUrl && idx === 0)
                    ? "border-stone-900/25 ring-1 ring-stone-900/15"
                    : "border-stone-200/90 hover:border-stone-300",
                  idx === 0 && "ring-1 ring-stone-900/10",
                )}
                title={isLikelyVideoUrl(img.image_url) ? "Video" : "Seç"}
              >
                {isLikelyVideoUrl(img.image_url) ? (
                  <>
                    <video src={img.image_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-black/55 px-1 py-px text-[8px] font-medium text-white">
                      Video
                    </span>
                  </>
                ) : (
                  <Image src={img.image_url} alt="" fill sizes="96px" className="object-cover" />
                )}
                {img.is_cover ? (
                  <span className="absolute left-0.5 top-0.5 rounded bg-stone-900/88 px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-white">
                    Kapak
                  </span>
                ) : null}
              </button>
              {canDelete ? (
                <button
                  type="submit"
                  form={`zelula-delete-image-${img.id}`}
                  className="absolute bottom-0.5 right-0.5 rounded bg-stone-900/80 px-1 py-px text-[8px] font-medium text-white opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-stone-950"
                  title="Sil"
                  onClick={(e) => {
                    if (!window.confirm("Bu görseli silmek istiyor musunuz?")) {
                      e.preventDefault();
                    }
                  }}
                >
                  Sil
                </button>
              ) : null}
            </div>
          ))}
          {sortedImages.length === 0 ? null : (
            <button
              type="button"
              disabled={!uploadEnabled}
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50/80 text-[10px] font-medium text-stone-500 transition hover:border-stone-400 hover:bg-white disabled:opacity-40"
            >
              +
            </button>
          )}
        </div>
      </div>
      {noImageExists ? (
        <p className="mt-2 text-[10px] text-stone-500">Yayın için en az bir görsel eklemeniz önerilir.</p>
      ) : null}
    </section>
  );
}
