import Image, { type ImageProps } from "next/image";
import { shouldUseUnoptimizedImage } from "@/lib/images/direct-load-url";
import { cn } from "@/lib/utils";

/** Harici URL'ler (Supabase, Trendyol vb.) — doğrudan <img>, yerel dosyalar next/image. */
export function ProductImage({
  src,
  unoptimized,
  className,
  alt,
  fill,
  sizes,
  width,
  height,
  style,
  ...rest
}: ImageProps) {
  const srcStr = typeof src === "string" ? src : "";
  const useDirect = unoptimized ?? shouldUseUnoptimizedImage(srcStr);

  if (useDirect && srcStr) {
    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={srcStr}
          alt={alt ?? ""}
          sizes={sizes}
          referrerPolicy="no-referrer"
          className={cn("object-cover", className)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }}
        />
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={srcStr}
        alt={alt ?? ""}
        width={typeof width === "number" ? width : undefined}
        height={typeof height === "number" ? height : undefined}
        sizes={sizes}
        referrerPolicy="no-referrer"
        className={className}
        style={style}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      width={width}
      height={height}
      className={className}
      style={style}
      unoptimized={useDirect}
      {...rest}
    />
  );
}
