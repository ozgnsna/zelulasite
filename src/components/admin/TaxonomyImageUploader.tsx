"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { uploadTaxonomyImage } from "@/app/actions/admin";
import { isNextRedirectError } from "@/lib/next-navigation-errors";
import {
  compressProductImageForUpload,
  PRODUCT_IMAGE_MAX_BYTES,
} from "@/lib/images/product-image-upload";

export function TaxonomyImageUploader({
  kind,
  id,
  currentImageUrl,
}: {
  kind: "category" | "collection";
  id: string;
  currentImageUrl?: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hasImage = Boolean(currentImageUrl && currentImageUrl.trim());

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|gif|webp|avif|heic|heif|bmp)$/i.test(file.name)) {
      setError("Yalnızca görsel dosyası seçin (JPG, PNG, WebP).");
      return;
    }
    setBusy(true);
    try {
      let uploadFile: File = file;
      try {
        uploadFile = await compressProductImageForUpload(file);
      } catch {
        // Sıkıştırma başarısızsa orijinali dene (boyut kontrolü sunucuda da var).
        uploadFile = file;
      }
      if (uploadFile.size > PRODUCT_IMAGE_MAX_BYTES) {
        setError("Görsel çok büyük; daha küçük bir dosya seçin.");
        setBusy(false);
        return;
      }
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("id", id);
      fd.append("image", uploadFile, uploadFile.name);
      await uploadTaxonomyImage(fd);
    } catch (err) {
      if (isNextRedirectError(err)) throw err;
      setError(err instanceof Error ? err.message : "Görsel yüklenemedi.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
        {hasImage ? (
          <Image
            src={currentImageUrl as string}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[9px] font-medium text-stone-400">
            Görsel yok
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
        >
          {busy ? "Yükleniyor…" : hasImage ? "Bilgisayardan değiştir" : "Bilgisayardan yükle"}
        </button>
        {error ? <p className="mt-1 text-[10px] text-rose-700">{error}</p> : null}
      </div>
    </div>
  );
}
