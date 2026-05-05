"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";

type Img = { id: string; image_url: string; is_cover?: boolean | null };

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
  /** Ayrı (boş) form id — görsel yükleme ana ürün formunun gövdesine karışmaz; Server Action boyutu sorunları önlenir. */
  uploadFormId?: string;
  uploadProductImageAction?: (formData: FormData) => Promise<void>;
  deleteProductImageAction?: (formData: FormData) => Promise<void>;
}) {
  const [selectedUrl, setSelectedUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadEnabled = Boolean(productId && uploadProductImageAction);
  const useExternalUploadForm = Boolean(uploadFormId && uploadEnabled);
  const cleanImages = useMemo(
    () => images.filter((x) => x && typeof x.image_url === "string" && x.image_url.trim().length > 0),
    [images],
  );
  const selectedPreview = isLikelyImageUrl(selectedUrl) ? selectedUrl.trim() : (cleanImages[0]?.image_url ?? "");
  const selectedPreviewIsVideo = isLikelyVideoUrl(selectedPreview);
  const noImageExists = cleanImages.length === 0;
  const canDelete = Boolean(productId && deleteProductImageAction);

  return (
    <section
      className={cn(
        "rounded-2xl border border-[#e9e1d6]/85 bg-[#fffdfa] p-5 shadow-[0_1px_2px_rgba(28,25,23,0.03),0_10px_24px_-16px_rgba(28,25,23,0.08)] sm:p-6",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-stone-800">Görseller</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500/75">
            Urun gorsel yonetimi paneli
          </p>
        </div>
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
            if (!uploadEnabled) return;
            const input = e.currentTarget;
            if (input.files && input.files.length > 0) {
              if (useExternalUploadForm && uploadFormId) {
                const el = document.getElementById(uploadFormId);
                if (el instanceof HTMLFormElement) {
                  el.requestSubmit();
                }
              }
              setTimeout(() => {
                input.value = "";
              }, 0);
            }
          }}
        />
        <button
          type="button"
          disabled={!uploadEnabled}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-[#dccfbe] bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-sm transition hover:border-[#cdbda8] hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
          title={uploadEnabled ? "Cihazdan görsel seç" : "Önce ürünü kaydet, sonra görsel yükle"}
        >
          + Medya ekle
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <div className="rounded-2xl border border-[#e7ded2]/70 bg-gradient-to-b from-[#fdfcfa] to-[#f7f2ea] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_4px_20px_-8px_rgba(120,83,40,0.12)] transition duration-150 hover:border-[#d7cab8]/90 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_24px_-10px_rgba(120,83,40,0.2)]">
          <div className="rounded-[14px] bg-white/92 p-3">
            <div className="relative aspect-[4/5] max-h-[min(58vh,560px)] min-h-[320px] w-full overflow-hidden rounded-xl bg-[#f4efe8] ring-1 ring-[#e7ded2]/40 transition duration-150 hover:ring-[#d8ccb9]/70">
              {selectedPreview ? (
                selectedPreviewIsVideo ? (
                  <video
                    src={selectedPreview}
                    controls
                    playsInline
                    className="h-full w-full object-cover"
                    preload="metadata"
                  />
                ) : (
                  <Image src={selectedPreview} alt="Urun gorsel onizleme" fill sizes="(max-width:1024px) 100vw, 720px" className="object-cover" priority={false} />
                )
              ) : (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-[#e7ded2]/80 bg-[#faf8f5] text-stone-400">
                    <ImageIcon className="h-9 w-9 text-stone-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-stone-600/90">Henuz gorsel yok</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-stone-500/65">Urunu yayinlamadan once en az bir gorsel ekle.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#e7ded2]/60 bg-white/90 p-3.5">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-stone-500/70">Kucuk gorseller</p>
          <div className="grid grid-cols-3 gap-2">
            {cleanImages.map((img) => (
              <div key={img.id} className="relative">
                <button
                  type="button"
                  onClick={() => setSelectedUrl(img.image_url)}
                  className="group relative h-20 w-full overflow-hidden rounded-xl border border-[#e7ded2]/80 bg-white shadow-sm transition-[box-shadow,transform,border-color,background-color] hover:border-[#d8ccb9] hover:bg-[#fdfbf8] hover:shadow-md active:scale-[0.97]"
                  title={isLikelyVideoUrl(img.image_url) ? "Video" : "Gorsel"}
                >
                  {isLikelyVideoUrl(img.image_url) ? (
                    <>
                      <video src={img.image_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                      <span className="absolute right-1 top-1 rounded bg-black/60 px-1 py-px text-[9px] font-medium text-white">
                        Video
                      </span>
                    </>
                  ) : (
                    <Image src={img.image_url} alt="" fill sizes="80px" className="object-cover" />
                  )}
                </button>
                {canDelete ? (
                  <button
                    type="submit"
                    form={`zelula-delete-image-${img.id}`}
                    className="absolute bottom-0.5 right-0.5 rounded bg-rose-700/95 px-1 py-px text-[9px] font-semibold text-white shadow hover:bg-rose-800"
                    title="Bu görseli kaldır"
                    onClick={(e) => {
                      if (!window.confirm("Bu görseli kalıcı olarak silmek istiyor musunuz?")) {
                        e.preventDefault();
                      }
                    }}
                  >
                    Sil
                  </button>
                ) : null}
              </div>
            ))}
            {cleanImages.length === 0 ? (
              <div className="col-span-3 rounded-lg border border-dashed border-[#e7ded2]/90 bg-[#faf8f5] px-2 py-5 text-center text-[10px] text-stone-500">
                Henuz gorsel eklenmedi.
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {noImageExists ? (
        <p className="mt-4 rounded-lg border border-amber-200/40 bg-amber-50/35 px-2.5 py-1.5 text-[10px] leading-relaxed text-amber-900/70">
          En az bir urun gorseli eklemen onerilir.
        </p>
      ) : null}
    </section>
  );
}
