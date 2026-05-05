import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Takı Bakım Rehberi",
  description: "Zelula takılarının ışıltısını korumak için bakım önerileri.",
};

export default function JewelryCareGuidePage() {
  const supportMessage = "Merhaba, takı bakımı hakkında destek almak istiyorum ✨";
  const supportHref = `https://wa.me/905550000000?text=${encodeURIComponent(supportMessage)}`;

  return (
    <main className="container-premium pb-20 pt-12 sm:pt-16">
      <section className="mx-auto max-w-3xl rounded-2xl border border-[#e6dbc8]/90 bg-[linear-gradient(165deg,#fffdfb_0%,#f8f2e8_100%)] p-6 shadow-[0_12px_30px_rgba(62,53,42,0.06)] sm:p-8">
        <h1 className="text-center font-serif text-3xl text-stone-900 sm:text-4xl">Takı Bakım Rehberi ✨</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-stone-600 sm:text-base">
          Zelula parçalarının ışıltısını uzun süre korumak için küçük ama etkili öneriler
        </p>
      </section>

      <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
        <section className="rounded-2xl border border-[#e8dfd2]/85 bg-[linear-gradient(180deg,#fffaf3_0%,#fffdf9_100%)] p-5 shadow-[0_8px_22px_rgba(62,53,42,0.05)]">
          <h2 className="font-serif text-lg text-stone-900">Günlük kullanım</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
            <li>- Parfüm ve kozmetik sonrası takını tak.</li>
            <li>- Duş, deniz ve havuzda çıkarmayı tercih et.</li>
            <li>- Sert darbe ve sürtünmeden koru.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[#e8dfd2]/85 bg-[linear-gradient(180deg,#fffdfb_0%,#faf9f7_100%)] p-5 shadow-[0_8px_22px_rgba(62,53,42,0.05)]">
          <h2 className="font-serif text-lg text-stone-900">Temizlik</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
            <li>- Yumuşak, kuru bir bezle nazikçe sil.</li>
            <li>- Kimyasal temizleyicilerden kaçın.</li>
            <li>- Nemli kaldığında mutlaka kurulayarak sakla.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[#e8dfd2]/85 bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-5 shadow-[0_8px_22px_rgba(62,53,42,0.05)]">
          <h2 className="font-serif text-lg text-stone-900">Saklama</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
            <li>- Her parçayı ayrı kesede veya kutuda sakla.</li>
            <li>- Kuru ve serin ortamda muhafaza et.</li>
            <li>- Uzun süre kullanmayacaksan hava ile temasını azalt.</li>
          </ul>
        </section>
      </div>

      <section className="mx-auto mt-6 max-w-3xl rounded-2xl border border-[#e4d4bb]/90 bg-[linear-gradient(160deg,#fffdfa_0%,#f9f2e7_100%)] p-5 text-center shadow-[0_10px_24px_rgba(62,53,42,0.07)] sm:p-6">
        <p className="text-sm leading-relaxed text-stone-700">
          Zelula takıları doğru kullanım ile uzun süre ilk günkü ışıltısını korur.
        </p>
      </section>

      <section className="mx-auto mt-6 max-w-3xl rounded-2xl border border-[#e5d6bf]/90 bg-white/85 p-5 shadow-[0_8px_22px_rgba(62,53,42,0.05)] sm:p-6">
        <h2 className="font-serif text-xl text-stone-900">Destek</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Parçana özel bakım önerisi için bizimle hızlıca iletişime geçebilirsin.
        </p>
        <a
          href={supportHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d2b176]/90 bg-[linear-gradient(135deg,#ead4aa_0%,#d9b87b_100%)] px-4 py-2.5 text-sm font-semibold text-[#34291f] shadow-[0_10px_24px_rgba(198,161,91,0.24)] transition hover:scale-[1.015] hover:brightness-[0.98] hover:shadow-[0_14px_30px_rgba(198,161,91,0.32)]"
        >
          <Image src="/WhatsApp.svg" alt="" width={18} height={18} className="shrink-0" aria-hidden />
          WhatsApp&apos;tan destek al
        </a>
      </section>
    </main>
  );
}
