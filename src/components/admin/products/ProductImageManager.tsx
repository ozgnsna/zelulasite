"use client";

import { isNextRedirectError } from "@/lib/next-navigation-errors";
import {
  isAllowedProductMediaFile,
  isProductVideoFile,
  isProductVideoUrl,
  PRODUCT_VIDEO_MAX_BYTES,
} from "@/lib/products/media-url";
import {
  prepareProductImageForUpload,
  PRODUCT_IMAGE_MAX_BYTES,
} from "@/lib/images/product-image-upload";
import { isTrendyolHttpsProductPhotoUrl } from "@/lib/marketplaces/trendyol/int-ids";
import { sortProductImages } from "@/lib/products/cover-image";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/product/ProductImage";
import { useEffect, useMemo, useRef, useState } from "react";

type Img = { id: string; image_url: string; is_cover?: boolean | null; sort_order?: number | null };

type PendingMedia = { id: string; file: File; previewUrl: string; isVideo: boolean };

function syncPendingFilesInput(input: HTMLInputElement | null, files: File[]) {
  if (!input) return;
  const dt = new DataTransfer();
  for (const file of files) dt.items.add(file);
  input.files = dt.files;
}

function isLikelyImageUrl(v: string): boolean {
  return /^https?:\/\/.+/i.test(v.trim());
}

function isLikelyVideoUrl(v: string): boolean {
  return isProductVideoUrl(v);
}

function isAllowedImageFile(file: File): boolean {
  return isAllowedProductMediaFile(file);
}

function pickFirstMediaFile(files: FileList | null): File | null {
  if (!files?.length) return null;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (isAllowedImageFile(file)) return file;
  }
  return null;
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
  return sortProductImages(list);
}

function countTrendyolHttpsPhotosForPanel(
  savedImages: Img[],
  pendingMedia: PendingMedia[],
  includePending: boolean,
): number {
  let count = savedImages.filter((img) => isTrendyolHttpsProductPhotoUrl(img.image_url)).length;
  if (includePending) {
    count += pendingMedia.filter((item) => !item.isVideo).length;
  }
  return count;
}

function syncTrendyolHttpsImageCount(count: number) {
  const el = document.getElementById("trendyol-https-image-count");
  if (!(el instanceof HTMLInputElement)) return;
  const next = String(Math.max(0, count));
  if (el.value === next) return;
  el.value = next;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function ProductImageManager({
  title = "Görseller",
  images,
  productId,
  returnTo,
  uploadFormId,
  uploadProductImageAction,
  deleteProductImageAction,
  setProductCoverImageAction,
  stagingMode = false,
}: {
  title?: string;
  images: Img[];
  productId?: string;
  returnTo?: string;
  uploadFormId?: string;
  uploadProductImageAction?: (formData: FormData) => Promise<void>;
  deleteProductImageAction?: (formData: FormData) => Promise<void>;
  setProductCoverImageAction?: (formData: FormData) => Promise<void>;
  /** Yeni ürün formu: görseller kayıt sırasında yüklensin. */
  stagingMode?: boolean;
}) {
  const [selectedUrl, setSelectedUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [clientError, setClientError] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [setUploadAsCover, setSetUploadAsCover] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingInputRef = useRef<HTMLInputElement | null>(null);
  const serverUploadEnabled = Boolean(productId && uploadProductImageAction);
  const uploadEnabled = serverUploadEnabled || stagingMode;
  const useExternalUploadForm = Boolean(uploadFormId && serverUploadEnabled);
  const sortedImages = useMemo(() => sortImages(images), [images]);
  const displayImages = useMemo(() => {
    const pendingRows: Img[] = pendingMedia.map((item, index) => ({
      id: item.id,
      image_url: item.previewUrl,
      is_cover:
        sortedImages.length === 0 &&
        index === 0 &&
        setUploadAsCover &&
        !item.isVideo
          ? true
          : null,
      sort_order: sortedImages.length + index,
    }));
    return [...sortedImages, ...pendingRows];
  }, [pendingMedia, setUploadAsCover, sortedImages]);
  const coverImage = displayImages.find((img) => Boolean(img.is_cover)) ?? displayImages[0];
  const selectedPreview = isLikelyImageUrl(selectedUrl) ? selectedUrl.trim() : (coverImage?.image_url ?? "");
  const selectedImage = displayImages.find((img) => img.image_url === selectedPreview);
  const selectedIsCover = Boolean(selectedImage?.is_cover);

  useEffect(() => {
    setSetUploadAsCover(displayImages.length === 0);
  }, [displayImages.length]);

  useEffect(() => {
    const includePending = stagingMode && !productId;
    syncTrendyolHttpsImageCount(
      countTrendyolHttpsPhotosForPanel(sortedImages, pendingMedia, includePending),
    );
  }, [sortedImages, pendingMedia, stagingMode, productId]);

  useEffect(() => {
    syncPendingFilesInput(
      pendingInputRef.current,
      pendingMedia.map((item) => item.file),
    );
  }, [pendingMedia]);

  useEffect(() => {
    return () => {
      for (const item of pendingMedia) URL.revokeObjectURL(item.previewUrl);
    };
  }, [pendingMedia]);
  const selectedPending = pendingMedia.find((item) => item.previewUrl === selectedPreview);
  const selectedPreviewIsVideo = selectedPending ? selectedPending.isVideo : isLikelyVideoUrl(selectedPreview);
  const noImageExists = displayImages.length === 0;
  const canDelete = Boolean(productId && deleteProductImageAction);

  const removePendingMedia = (id: string) => {
    setPendingMedia((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const stageFile = async (file: File) => {
    const isVideo = isProductVideoFile(file);
    let uploadFile: File = file;
    if (!isVideo) {
      try {
        uploadFile = await prepareProductImageForUpload(file, {
          flattenBackground: false,
          flattenFn: async (f) => f,
        });
      } catch {
        setClientError(
          `Görsel işlenemedi (${Math.round(file.size / 1024 / 1024)} MB). Daha küçük bir dosya deneyin.`,
        );
        return;
      }
      if (uploadFile.size > PRODUCT_IMAGE_MAX_BYTES) {
        setClientError("Sıkıştırma sonrası dosya hâlâ çok büyük; daha küçük bir kaynak görsel seçin.");
        return;
      }
    } else if (file.size > PRODUCT_VIDEO_MAX_BYTES) {
      setClientError(`Video çok büyük; en fazla ~${Math.round(PRODUCT_VIDEO_MAX_BYTES / 1024 / 1024)} MB yükleyebilirsiniz.`);
      return;
    }

    const previewUrl = URL.createObjectURL(uploadFile);
    setPendingMedia((prev) => [
      ...prev,
      {
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file: uploadFile,
        previewUrl,
        isVideo,
      },
    ]);
    setSelectedUrl(previewUrl);
  };

  const submitFiles = async (files: FileList | null) => {
    if (!uploadEnabled || !fileInputRef.current) return;
    setClientError("");
    const file = pickFirstMediaFile(files);
    if (!file) {
      setClientError("Yalnızca görsel (JPG, PNG, WebP) veya video (MP4, WebM, MOV) seçin.");
      return;
    }

    if (stagingMode && !productId) {
      setUploadBusy(true);
      try {
        await stageFile(file);
      } finally {
        setUploadBusy(false);
        fileInputRef.current.value = "";
      }
      return;
    }

    if (!serverUploadEnabled || !productId || !uploadProductImageAction) return;
    const isVideo = isProductVideoFile(file);
    setUploadBusy(true);
    try {
      let uploadFile: File = file;
      if (!isVideo) {
        try {
          uploadFile = await prepareProductImageForUpload(file, {
            flattenBackground: false,
            flattenFn: async (f) => f,
          });
        } catch {
          setClientError(
            `Görsel işlenemedi (${Math.round(file.size / 1024 / 1024)} MB). Daha küçük bir dosya deneyin.`,
          );
          return;
        }
        if (uploadFile.size > PRODUCT_IMAGE_MAX_BYTES) {
          setClientError("Sıkıştırma sonrası dosya hâlâ çok büyük; daha küçük bir kaynak görsel seçin.");
          return;
        }
      } else if (file.size > PRODUCT_VIDEO_MAX_BYTES) {
        setClientError(`Video çok büyük; en fazla ~${Math.round(PRODUCT_VIDEO_MAX_BYTES / 1024 / 1024)} MB yükleyebilirsiniz.`);
        return;
      }
      const fd = new FormData();
      fd.append("product_id", productId);
      fd.append("return_to", returnTo ?? "");
      fd.append("set_as_cover", !isVideo && setUploadAsCover ? "1" : "0");
      fd.append("image", uploadFile, uploadFile.name);
      await uploadProductImageAction(fd);
    } catch (err) {
      if (isNextRedirectError(err)) throw err;
      setClientError(err instanceof Error ? err.message : "Görsel yüklenemedi.");
    } finally {
      setUploadBusy(false);
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      {uploadBusy ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-white/92 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
        >
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-stone-300 border-t-[#b8945f]" aria-hidden />
          <p className="text-sm font-medium text-stone-800">Medya yükleniyor…</p>
        </div>
      ) : null}
    <section
      id="product-section-images"
      className="scroll-mt-24 rounded-2xl border border-stone-200/50 bg-white/95 p-4 shadow-[0_2px_12px_-4px_rgba(28,25,23,0.06)] sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight text-stone-900">{title}</h2>
          <p className="mt-0.5 text-[10px] leading-relaxed text-stone-500">
            Fotoğraf veya video ekleyin. Kapak yalnızca fotoğraf olabilir (liste, SEO, Trendyol). Videolar ürün sayfası galerisinde oynatılır.
            {stagingMode && !productId ? (
              <span className="mt-1 block text-stone-600">Seçilen görseller ürünü kaydettiğinizde otomatik yüklenir.</span>
            ) : null}
          </p>
          <div className="mt-2">
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-stone-700">
              <input
                type="checkbox"
                checked={setUploadAsCover}
                onChange={(e) => setSetUploadAsCover(e.target.checked)}
                className="size-3.5 rounded border-stone-300"
              />
              Yüklenen fotoğrafı kapak yap (video için geçerli değil)
            </label>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {useExternalUploadForm ? (
            <>
              <input type="hidden" name="product_id" form={uploadFormId} value={productId ?? ""} />
              <input type="hidden" name="return_to" form={uploadFormId} value={returnTo ?? ""} />
            </>
          ) : null}
          {stagingMode && !productId ? (
            <>
              <input
                ref={pendingInputRef}
                type="file"
                name="pending_images"
                multiple
                className="hidden"
                tabIndex={-1}
                aria-hidden
              />
              <input type="hidden" name="pending_set_as_cover" value={setUploadAsCover ? "1" : "0"} />
            </>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            name={stagingMode && !productId ? undefined : "image"}
            form={useExternalUploadForm ? uploadFormId : undefined}
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.heic,.mp4,.webm,.mov"
            className="hidden"
            onChange={(e) => {
              submitFiles(e.currentTarget.files);
            }}
          />
          <button
            type="button"
            disabled={!uploadEnabled || uploadBusy}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] rounded-lg border border-stone-300/90 bg-stone-900 px-3.5 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:py-1.5"
            title={uploadEnabled ? (stagingMode && !productId ? "Dosya seç (kayıt ile yüklenecek)" : "Dosya seç") : "Önce ürünü kaydedin"}
          >
            Dosya seç
          </button>
        </div>
      </div>

      {clientError ? (
        <p className="mb-2 rounded-lg border border-rose-200/90 bg-rose-50/90 px-3 py-2 text-[11px] text-rose-950">{clientError}</p>
      ) : null}

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
            "relative flex min-h-[180px] max-h-[min(38vh,360px)] flex-col overflow-hidden rounded-xl border border-stone-200/80 bg-white",
            noImageExists && "min-h-[160px]",
          )}
        >
          {selectedPreview ? (
            selectedPreviewIsVideo ? (
              <video src={selectedPreview} controls playsInline className="h-full w-full object-contain" preload="metadata" />
            ) : (
              <div className="relative min-h-[180px] flex-1">
                <ProductImage
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
              <p className="max-w-[14rem] text-[10px] leading-snug text-stone-500">
                {stagingMode && !productId
                  ? "PNG, JPG veya video. Ürünü kaydettiğinizde yüklenir."
                  : "PNG, JPG veya video. Yüklemeden önce ürünü kaydedin."}
              </p>
            </button>
          )}
          {selectedImage && productId && setProductCoverImageAction && !selectedIsCover && !selectedPreviewIsVideo ? (
            <div className="border-t border-stone-100 bg-stone-50/80 px-3 py-2.5">
              <button
                type="button"
                className="w-full rounded-lg bg-stone-900 px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-stone-800"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const form = document.getElementById(`zelula-cover-image-${selectedImage.id}`);
                  if (!(form instanceof HTMLFormElement)) {
                    console.error("[ProductImageManager] kapak formu bulunamadı:", selectedImage.id);
                    return;
                  }
                  form.requestSubmit();
                }}
              >
                Bu görseli kapak yap (anasayfa + liste)
              </button>
            </div>
          ) : selectedIsCover && selectedPreview ? (
            <p className="border-t border-stone-100 bg-emerald-50/80 px-3 py-2 text-center text-[10px] font-medium text-emerald-900">
              Bu görsel şu an kapak.
            </p>
          ) : null}
        </div>

        <div className="flex w-full min-w-0 flex-col gap-1.5 lg:w-[11.5rem] lg:shrink-0">
          <p className="hidden text-[9px] font-semibold uppercase tracking-wide text-stone-400 lg:block">Küçük önizleme</p>
          {displayImages.length > 0 ? (
            <p className="pl-0.5 text-[9px] text-stone-400 lg:hidden">Kaydırarak tüm görselleri görün</p>
          ) : null}
          <div
            className={cn(
              "flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-1.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] snap-x snap-mandatory lg:grid lg:max-h-none lg:grid-cols-2 lg:gap-2 lg:overflow-visible lg:pb-0 lg:snap-none",
              "[&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300/80",
            )}
          >
            {displayImages.map((img) => {
              const isPending = img.id.startsWith("pending-");
              const pendingItem = isPending ? pendingMedia.find((item) => item.id === img.id) : null;
              const imgIsVideo = pendingItem ? pendingItem.isVideo : isLikelyVideoUrl(img.image_url);
              const isCover = Boolean(img.is_cover);
              const canSetCover = Boolean(
                productId && setProductCoverImageAction && !isCover && !imgIsVideo && !isPending,
              );
              return (
                <div key={img.id} className="group relative w-[4.25rem] shrink-0 snap-start sm:w-[4.5rem] lg:w-full lg:shrink">
                  <button
                    type="button"
                    onClick={() => setSelectedUrl(img.image_url)}
                    className={cn(
                      "relative block h-14 w-full overflow-hidden rounded-lg border bg-white transition sm:h-16",
                      selectedPreview === img.image_url
                        ? "border-stone-800/40 ring-2 ring-stone-900/15"
                        : "border-stone-200/90 hover:border-stone-400",
                    )}
                    title={imgIsVideo ? "Video" : isCover ? "Kapak görseli" : "Önizle — Kapak yap ile vitrine alın"}
                  >
                    {imgIsVideo ? (
                      <>
                        <video src={img.image_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/55 px-1 py-px text-[7px] font-medium text-white">
                          ▶
                        </span>
                      </>
                    ) : (
                      <ProductImage src={img.image_url} alt="" fill sizes="72px" className="object-contain bg-white p-0.5" />
                    )}
                    {isCover ? (
                      <span className="absolute left-0.5 top-0.5 rounded bg-stone-900/90 px-1 py-px text-[7px] font-bold uppercase tracking-wide text-white">
                        Kapak
                      </span>
                    ) : null}
                  </button>
                  {canSetCover ? (
                    <button
                      type="button"
                      className="mt-0.5 w-full rounded bg-stone-900 px-1 py-1 text-[8px] font-semibold text-white hover:bg-stone-800"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const form = document.getElementById(`zelula-cover-image-${img.id}`);
                        if (!(form instanceof HTMLFormElement)) {
                          console.error("[ProductImageManager] kapak formu bulunamadı:", img.id);
                          return;
                        }
                        form.requestSubmit();
                      }}
                    >
                      Kapak yap
                    </button>
                  ) : null}
                  {canDelete && !isPending ? (
                    <button
                      type="button"
                      className="absolute -right-0.5 -top-0.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-rose-700 shadow-md ring-1 ring-rose-200/90 opacity-90 transition hover:bg-rose-50 active:scale-95 lg:h-6 lg:w-6 lg:text-[10px] lg:opacity-0 lg:group-hover:opacity-100"
                      title="Sil"
                      aria-label="Görseli sil"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!window.confirm("Bu görseli silmek istiyor musunuz?")) return;
                        const form = document.getElementById(`zelula-delete-image-${img.id}`);
                        if (!(form instanceof HTMLFormElement)) {
                          console.error("[ProductImageManager] silme formu bulunamadı:", img.id);
                          return;
                        }
                        form.requestSubmit();
                      }}
                    >
                      ×
                    </button>
                  ) : isPending ? (
                    <button
                      type="button"
                      className="absolute -right-0.5 -top-0.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-rose-700 shadow-md ring-1 ring-rose-200/90 opacity-90 transition hover:bg-rose-50 active:scale-95 lg:h-6 lg:w-6 lg:text-[10px]"
                      title="Kaldır"
                      aria-label="Seçilen görseli kaldır"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removePendingMedia(img.id);
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              );
            })}
            {displayImages.length === 0 ? null : (
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
    </>
  );
}
