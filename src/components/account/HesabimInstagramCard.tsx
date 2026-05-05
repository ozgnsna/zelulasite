import Link from "next/link";

export function HesabimInstagramCard() {
  return (
    <section
      id="ayricaliklar"
      className="scroll-mt-24 rounded-2xl border border-[#e8dfd3]/85 bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03)] sm:p-7"
    >
      <h2 className="font-serif text-xl text-stone-900">Zelula ayrıcalıklarım</h2>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        Instagram&apos;da{" "}
        <Link
          href="https://www.instagram.com/zelulaofficial/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[color:var(--brand-gold)] underline-offset-2 hover:underline"
        >
          @zelulaofficial
        </Link>{" "}
        hesabımızı takip et, DM&apos;den &quot;İNDİRİM KODU&quot; yaz; sana özel %10 indirim kodun gönderilsin.
      </p>
    </section>
  );
}
