"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CreditCard, Gem, RotateCcw, Truck } from "lucide-react";

const items = [
  { label: "Güvenli ödeme", description: "3D Secure ve şifreli altyapı", Icon: CreditCard },
  { label: "Hızlı kargo", description: "Siparişin özenle yola çıkar", Icon: Truck },
  { label: "Kolay iade", description: "14 gün içinde risksiz iade", Icon: RotateCcw },
  { label: "Kaliteli materyal", description: "Dayanıklı, zamansız seçimler", Icon: Gem },
] as const;

export function HomeWhyZelula() {
  const reduce = useReducedMotion();

  return (
    <section className="border-t border-[#ebe6df] bg-[#faf8f5] py-14 sm:py-20">
      <div className="container-premium">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-stone-600">Güven</p>
          <h2 className="mt-4 font-serif text-2xl font-light tracking-tight text-stone-900 sm:text-3xl">
            Neden Zelula?
          </h2>
        </div>
        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-5">
          {items.map(({ label, description, Icon }, i) => (
            <motion.li
              key={label}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex h-full flex-col rounded-2xl border border-[#e8e2d9] bg-[#fffdfb] px-5 py-6 shadow-[0_10px_28px_rgba(55,48,40,0.05)] transition-shadow duration-300 hover:shadow-[0_14px_36px_rgba(198,161,91,0.12)]">
                <span className="flex size-11 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[#fff9f0] text-brand-gold-a11y">
                  <Icon className="size-5" strokeWidth={1.5} aria-hidden />
                </span>
                <p className="mt-4 text-sm font-semibold text-stone-900">{label}</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-600">{description}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
