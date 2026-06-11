"use client";

import Image from "next/image";
import { useState } from "react";

type InstagramFeedImageProps = {
  src: string;
  alt: string;
  fallbackSrc: string;
  className?: string;
};

function truncateAlt(text: string, max = 80): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function InstagramFeedImage({ src, alt, fallbackSrc, className }: InstagramFeedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  return (
    <Image
      src={failed ? fallbackSrc : imgSrc}
      alt={truncateAlt(alt)}
      width={500}
      height={500}
      unoptimized
      referrerPolicy="no-referrer"
      onError={() => {
        if (!failed) {
          setFailed(true);
          setImgSrc(fallbackSrc);
        }
      }}
      className={className}
    />
  );
}
