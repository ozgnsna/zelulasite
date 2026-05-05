"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

type CinematicLinkCardProps = {
  href: string;
  imageSrc: string;
  title: string;
  kicker?: string;
  cta?: string;
  description?: string | null;
  /** Kategori kartı veya koleksiyon şeridi */
  preset?: "category" | "collection";
  aspectClass?: string;
  sizes?: string;
};

export function CinematicLinkCard({
  href,
  imageSrc,
  title,
  kicker = "Keşfet",
  cta = "Keşfet",
  description,
  preset = "category",
  aspectClass = "aspect-[3/4] sm:aspect-[4/5]",
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw",
}: CinematicLinkCardProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <Link
        href={href}
        aria-label={`${title} — ${cta}`}
        className={`group relative isolate block w-full overflow-hidden rounded-2xl border border-brand-gold/15 bg-stone-200 shadow-[0_14px_36px_rgba(55,45,35,0.1)] ring-1 ring-stone-900/5 transition-[box-shadow,border-color,transform] duration-500 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-brand-gold/45 motion-safe:hover:shadow-[0_28px_56px_rgba(201,168,106,0.22),0_0_0_1px_rgba(201,168,106,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold ${
          preset === "collection" ? "min-h-[220px] sm:min-h-[240px]" : aspectClass
        }`}
      >
        <Image
          src={imageSrc}
          alt=""
          role="presentation"
          fill
          sizes={sizes}
          className="object-cover transition duration-[900ms] ease-out motion-safe:group-hover:scale-[1.06]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/55 to-black/25 transition duration-300 motion-safe:group-hover:from-black/95 motion-safe:group-hover:via-black/65"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-80 motion-safe:group-hover:opacity-95" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <div className="rounded-xl bg-black/25 px-1 py-0.5 backdrop-blur-md supports-[backdrop-filter]:bg-black/20">
            {kicker ? (
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/90">{kicker}</p>
            ) : null}
            <p
              className={`px-1 font-serif text-2xl font-semibold leading-tight tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)] sm:text-[1.7rem] ${kicker ? "mt-2" : "mt-0"}`}
            >
              {title}
            </p>
            {description ? (
              <p className="mt-2 line-clamp-2 px-1 text-sm leading-relaxed text-white/85">{description}</p>
            ) : null}
            <p className="mt-4 inline-flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gold transition duration-300 group-hover:text-[#fff8ea]">
              {cta}
              <ArrowRight
                className="size-3.5 transition duration-300 ease-out group-hover:translate-x-1.5"
                aria-hidden
              />
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
