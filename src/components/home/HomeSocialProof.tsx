const quotes = [
  { text: "“Zarif ve hafif; her gün taktım.”", who: "Selin, İstanbul" },
  { text: "“Paketleme bile hediye gibiydi.”", who: "Deniz, Ankara" },
] as const;

export function HomeSocialProof() {
  return (
    <section className="container-premium py-14 sm:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-stone-500">Sosyal kanıt</p>
        <h2 className="mt-4 font-serif text-2xl font-light text-stone-900 sm:text-3xl">Zelula&apos;yı tercih edenler</h2>
        <p className="mt-3 text-2xl font-light tabular-nums text-[color:var(--brand-gold)] sm:text-3xl">
          10.000+ <span className="text-base font-normal text-stone-700 sm:text-lg">mutlu müşteri</span>
        </p>
      </div>
      <ul className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2 sm:gap-5">
        {quotes.map((q) => (
          <li
            key={q.text}
            className="rounded-2xl border border-[#e8e2d9] bg-[#fffdfb] px-5 py-5 text-left shadow-[0_8px_24px_rgba(55,48,40,0.04)]"
          >
            <p className="text-sm font-light leading-relaxed text-stone-800">{q.text}</p>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">{q.who}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
