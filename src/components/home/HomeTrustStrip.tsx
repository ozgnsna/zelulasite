import { CalendarDays, Droplets, HeartHandshake, Sparkles } from "lucide-react";

const items = [
  { label: "Suya dayanıklı", Icon: Droplets },
  { label: "Kararma yapmaz", Icon: Sparkles },
  { label: "Alerji dostu", Icon: HeartHandshake },
  { label: "14 gün iade", Icon: CalendarDays },
] as const;

export function HomeTrustStrip() {
  return (
    <section
      className="border-b border-[#e8e3da] bg-[#faf9f7]/95 py-7 sm:py-9"
      aria-label="Zelula güvencesi"
    >
      <div className="container-premium">
        <ul className="mx-auto flex max-w-5xl flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-y-4 sm:gap-x-3">
          {items.map(({ label, Icon }) => (
            <li key={label} className="sm:flex-1 sm:min-w-[9.5rem]">
              <div
                className="flex cursor-default items-center justify-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition-all duration-200 ease-out motion-safe:hover:scale-105 motion-safe:hover:border-[color:var(--brand-gold)]/25 motion-safe:hover:bg-white/70 motion-safe:hover:shadow-[0_10px_32px_rgba(201,168,106,0.28)] sm:justify-center"
              >
                <Icon className="size-[1.05rem] shrink-0 text-[color:var(--brand-gold)]" strokeWidth={1.35} aria-hidden />
                <span className="text-[12px] font-medium tracking-[0.06em] text-stone-700 sm:text-[13px]">{label}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
