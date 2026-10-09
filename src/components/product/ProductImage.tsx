"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { buildDerivativeSrcSet } from "@/lib/images/derivative-url";
import { shouldUseUnoptimizedImage } from "@/lib/images/direct-load-url";
import { cn } from "@/lib/utils";

type ProductImageProps = ImageProps & {
  /**
   * product_images.derivative_widths. Yalnızca burada yazılı genişlikler srcset'e girer.
   * Boşsa orijinal src kullanılır.
   */
  derivativeWidths?: number[] | null;
  /** Kart yalnızca w400 ister; galeri w400 + w800. */
  derivativeUse?: "card" | "gallery";
};

/** Harici URL'ler doğrudan img. Türev srcset sadece DB'de doğrulanmış genişliklerde. */
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
  derivativeWidths,
  derivativeUse = "card",
  ...rest
}: ProductImageProps) {
  const srcStr = typeof src === "string" ? src : "";
  const useDirect = unoptimized ?? shouldUseUnoptimizedImage(srcStr);
  const [derivativesFailed, setDerivativesFailed] = useState(false);
  const srcSet =
    !derivativesFailed && srcStr
      ? buildDerivativeSrcSet(srcStr, derivativeWidths ?? [], derivativeUse)
      : undefined;

  if (useDirect && srcStr) {
    const onError = srcSet
      ? () => {
          setDerivativesFailed(true);
        }
      : undefined;
    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={srcStr}
          alt={alt ?? ""}
          sizes={srcSet ? sizes : undefined}
          srcSet={srcSet}
          onError={onError}
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
        sizes={srcSet ? sizes : undefined}
        srcSet={srcSet}
        onError={onError}
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
