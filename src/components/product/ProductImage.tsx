import Image, { type ImageProps } from "next/image";
import { shouldUseUnoptimizedImage } from "@/lib/images/direct-load-url";

/** Ürün görselleri — Supabase Storage /_next/image ile; Trendyol / Pexels vb. doğrudan yüklenir. */
export function ProductImage({ src, unoptimized, ...props }: ImageProps) {
  const srcStr = typeof src === "string" ? src : "";
  return (
    <Image
      src={src}
      unoptimized={unoptimized ?? shouldUseUnoptimizedImage(srcStr)}
      {...props}
    />
  );
}
