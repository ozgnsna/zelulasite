"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, CircleCheck, Gift, Heart } from "lucide-react";

const items = [
  {
    label: "Kararma yapmaz",
    description: "Uzun süre parlaklık",
    Icon: CircleCheck,
  },
  {
    label: "Günlük kullanıma uygun",
    description: "Her an rahat kullanım",
    Icon: Heart,
  },
  {
    label: "Özenli paketleme",
    description: "Hediye gibi teslim",
    Icon: Gift,
  },
  {
    label: "14 gün iade",
    description: "Risksiz alışveriş",
    Icon: CalendarDays,
  },
] as const;

export function HomeTrustSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-t border-brand-gold/10 py-16 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_40%,rgba(201,168,106,0.14),transparent_62%),radial-gradient(circle_at_20%_80%,rgba(232,207,198,0.35),transparent_45%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,253,251,0.9),transparent_40%)] opacity-60" aria-hidden />

      <div className="container-premium relative">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-brand-gold/20 bg-gradient-to-b from-[#fffdfb]/95 via-[#faf7f3] to-brand-rose/20 px-6 py-14 text-center shadow-[0_28px_64px_rgba(70,53,38,0.09)] backdrop-blur-[2px] sm:px-14 sm:py-20">
          <p className="editorial-kicker text-brand-gold">Güven</p>
          <h2 className="section-title mx-auto mt-5 max-w-2xl text-balance sm:mt-6 sm:text-4xl">
            {"Neden Zelula'yı tercih ediyorlar?"}
          </h2>
          <ul className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-10 sm:mt-16 sm:grid-cols-2 sm:gap-x-12 sm:gap-y-14 lg:grid-cols-4 lg:gap-12">
            {items.map(({ label, description, Icon }, i) => (
              <motion.li
                key={label}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: reduce ? 0 : i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center gap-4 text-center"
              >
                <motion.span
                  whileHover={reduce ? undefined : { scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                  className="flex size-16 items-center justify-center rounded-full border-2 border-brand-gold/40 bg-white text-brand-gold shadow-[0_12px_36px_rgba(201,168,106,0.22)] ring-4 ring-brand-gold/5"
                >
                  <Icon className="size-7" strokeWidth={1.35} aria-hidden />
                </motion.span>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold leading-snug text-stone-900">{label}</p>
                  <p className="max-w-[14rem] text-xs leading-relaxed text-stone-600">{description}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
