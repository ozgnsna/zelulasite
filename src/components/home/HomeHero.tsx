"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

type Props = {
  imageSrc: string;
  videoUrl?: string | null;
};

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.11, delayChildren: 0.06 },
  },
};

/** prefers-reduced-motion: stagger 0 so çocuklar tek karede görünür */
function getContainer(reduce: boolean) {
  if (reduce) {
    return {
      hidden: {},
      visible: { transition: { staggerChildren: 0, delayChildren: 0 } },
    };
  }
  return container;
}

const fadeUpMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeUpStatic = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0 } },
};

export function HomeHero({ imageSrc, videoUrl }: Props) {
  const reduceMotion = useReducedMotion();
  const reduce = Boolean(reduceMotion);
  const fadeUp = reduce ? fadeUpStatic : fadeUpMotion;
  const [videoFailed, setVideoFailed] = useState(false);
  const showVideo = Boolean(videoUrl?.trim()) && !videoFailed;

  const onVideoError = useCallback(() => {
    setVideoFailed(true);
  }, []);

  return (
    <section className="zl-shimmer relative min-h-[100svh] w-full overflow-hidden bg-[#f4f0ea]">
      <div className="absolute inset-0">
        {showVideo ? (
          <motion.div
            className="h-full w-full"
            animate={reduce ? undefined : { scale: [1, 1.04] }}
            transition={reduce ? undefined : { duration: 18, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          >
            <video
              className="h-full w-full object-cover object-center"
              poster={imageSrc}
              muted
              playsInline
              autoPlay
              loop
              preload="metadata"
              aria-hidden
              onError={onVideoError}
            >
              <source src={videoUrl!.trim()} type="video/mp4" />
            </video>
          </motion.div>
        ) : (
          <motion.div
            className="relative h-full min-h-[100svh] w-full"
            animate={reduce ? undefined : { scale: [1, 1.04] }}
            transition={reduce ? undefined : { duration: 18, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          >
            <Image
              src={imageSrc}
              alt=""
              fill
              priority
              className="object-cover object-[center_38%]"
              sizes="100vw"
            />
          </motion.div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-black/12" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 via-[#faf8f5]/55 to-[#faf8f5] sm:via-[#faf8f5]/45"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_18%,rgba(255,255,255,0.55),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay motion-reduce:opacity-20"
        aria-hidden
      >
        <div className="home-hero-shimmer absolute inset-0" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-4xl flex-col items-center justify-center px-5 pb-32 pt-24 text-center sm:px-10 sm:pb-36 sm:pt-28">
        <motion.div
          variants={getContainer(reduce)}
          initial={reduce ? false : "hidden"}
          animate="visible"
          className="flex flex-col items-center"
        >
          <motion.h1 variants={fadeUp} className="hero-zelula-logo-wrap mt-6 sm:mt-8">
            <span className="hero-zelula-logo inline-block px-1 pb-1 font-serif text-[clamp(3rem,11vw,7.25rem)] font-light leading-[1.02] tracking-[-0.04em]">
              Zelula
            </span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-md font-serif text-[clamp(1.25rem,3.2vw,1.85rem)] font-medium italic leading-relaxed text-stone-800 sm:mt-7"
          >
            Takı değil, bir his.
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="mt-4 max-w-sm text-sm font-normal leading-relaxed tracking-wide text-stone-700"
          >
            En çok tercih edilen parçaları keşfet
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex w-full max-w-sm flex-col items-stretch gap-3 sm:mt-10">
            <motion.div whileHover={reduce ? undefined : { scale: 1.02 }} whileTap={reduce ? undefined : { scale: 0.98 }}>
              <Link
                href="/urunler"
                className="zl-btn inline-flex min-h-[3.1rem] w-full items-center justify-center rounded-full border border-stone-900/10 bg-stone-900 px-8 py-3 text-[12px] font-medium uppercase tracking-[0.18em] text-[#fdfbf7] shadow-[0_18px_48px_rgba(28,24,20,0.18)] ring-1 ring-white/10 transition-[box-shadow,background-color] duration-300 ease-out hover:bg-[#2a2420] hover:shadow-[0_24px_62px_rgba(201,168,106,0.22)] sm:text-[13px] sm:tracking-[0.2em]"
              >
                Şimdi alışverişe başla
              </Link>
            </motion.div>
            <motion.div whileHover={reduce ? undefined : { scale: 1.01 }} whileTap={reduce ? undefined : { scale: 0.99 }}>
              <Link
                href="/cok-satanlar"
                className="inline-flex min-h-[2.85rem] w-full items-center justify-center rounded-full border border-stone-800/15 bg-white/90 px-8 py-2.5 text-[12px] font-medium uppercase tracking-[0.16em] text-stone-800 shadow-sm backdrop-blur-[2px] transition hover:border-[color:var(--brand-gold)]/40 hover:bg-[#fffdfb] sm:text-[13px]"
              >
                Çok satanları incele
              </Link>
            </motion.div>
            <Link
              href="/urunler"
              className="pt-1 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-stone-600 underline-offset-[5px] transition hover:text-stone-900 hover:underline"
            >
              Tüm ürünleri keşfet
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="pointer-events-none absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-[13px] font-light text-stone-400"
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? undefined : { opacity: [0.4, 0.75, 0.4], y: [0, 5, 0] }}
        transition={reduce ? undefined : { duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        aria-hidden
      >
        ↓
      </motion.div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#faf8f5] to-transparent sm:h-36" aria-hidden />
    </section>
  );
}
