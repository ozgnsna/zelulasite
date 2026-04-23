"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type Img = { id: string; image_url: string };

export function ProductGallery({
  images,
  fallback,
  alt,
}: {
  images: Img[];
  fallback: string;
  alt: string;
}) {
  const list = useMemo(() => (images.length ? images : [{ id: "fallback", image_url: fallback }]), [images, fallback]);
  const [active, setActive] = useState(list[0]?.image_url ?? fallback);

  return (
    <div className="space-y-4">
      <div className="group relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-[#e7ddcf] bg-stone-100 shadow-[0_14px_30px_rgba(70,53,38,0.10)]">
        <Image
          src={active}
          alt={alt}
          fill
          priority
          className="object-cover transition duration-700 group-hover:scale-[1.1]"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {list.slice(0, 4).map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setActive(img.image_url)}
            className={`relative aspect-square overflow-hidden rounded-xl border ${active === img.image_url ? "border-stone-500" : "border-[#e6dccf]"}`}
          >
            <Image src={img.image_url} alt={alt} fill className="object-cover" sizes="120px" />
          </button>
        ))}
      </div>
    </div>
  );
}
