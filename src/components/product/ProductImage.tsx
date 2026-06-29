import Image, { type ImageProps } from "next/image";
import { shouldUseUnoptimizedImage } from "@/lib/images/direct-load-url";

/** Ürün görselleri — harici URL'ler (Supabase, Trendyol vb.) doğrudan yüklenir. */
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
