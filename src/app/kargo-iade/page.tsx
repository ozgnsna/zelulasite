import type { Metadata } from "next";
import Image from "next/image";
import { RefreshCcw, Truck } from "lucide-react";
import { getSupportWhatsAppHref } from "@/lib/support-contact";

export const metadata: Metadata = {
  title: "Kargo & İade",
  description: "Kargo ve iade süreçleri hakkında hızlı bilgiler.",
};

export default function ShippingReturnsPage() {
  const supportMessage = "Merhaba, iade süreci hakkında destek almak istiyorum ✨";
  const supportHref = getSupportWhatsAppHref(supportMessage);

  return (
    <main className="container-premium pb-20 pt-12 sm:pt-16">
      <section className="mx-auto max-w-3xl rounded-2xl border border-[#e6dbc8]/90 bg-[linear-gradient(165deg,#fffdfb_0%,#f8f2e8_100%)] p-6 shadow-[0_12px_30px_rgba(62,53,42,0.06)] sm:p-8">
        <h1 className="text-center font-serif text-3xl text-stone-900 sm:text-4xl">Kargo & İade Süreçleri</h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-stone-600 sm:text-base">
          Siparişlerin güvenle hazırlanır ve hızlıca sana ulaşır ✨
        </p>
      </section>

      <div className="mx-auto mt-8 grid max-w-3xl gap-4">
        <section className="rounded-2xl border border-[#e8dfd2]/85 bg-[linear-gradient(180deg,#fff8ee_0%,#fffdf9_100%)] p-5 shadow-[0_8px_22px_rgba(62,53,42,0.05)] sm:p-6">
          <h2 className="flex items-center gap-2 font-serif text-xl text-stone-900">
            <Truck className="size-4 text-[#b8945f]" strokeWidth={1.8} aria-hidden />
            Kargo
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
            <li>
              - Saat 13:00&apos;a kadar verilen siparişler aynı gün DHL Kargo&apos;ya teslim edilir. Cumartesi ve pazar
              verilen siparişler pazartesi kargoya teslim edilir.
            </li>
            <li>- Gönderimler yalnızca Türkiye içi adreslere yapılır.</li>
            <li>- Teslimat süresi adres ve dönemsel yoğunluğa göre değişebilir.</li>
            <li>- Tüm siparişlerin özenle paketlenir.</li>
          </ul>
        </section>

        <p className="px-1 text-center text-sm font-semibold text-stone-700">Zelula&apos;da alışveriş güvenlidir 💛</p>

        <section className="rounded-2xl border border-[#e8dfd2]/85 bg-[linear-gradient(180deg,#ffffff_0%,#faf9f7_100%)] p-5 shadow-[0_8px_22px_rgba(62,53,42,0.05)] sm:p-6">
          <h2 className="flex items-center gap-2 font-serif text-xl text-stone-900">
            <RefreshCcw className="size-4 text-[#b8945f]" strokeWidth={1.8} aria-hidden />
            İade
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Memnun kalmadığın durumlarda kolayca iade edebilirsin.
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
            <li>- Teslimattan itibaren 14 gün içinde iade talebi oluşturabilirsin.</li>
            <li>- Ürün kullanılmamış, zarar görmemiş ve orijinal haliyle gönderilmelidir.</li>
            <li>- İade kargo ücreti Zelula tarafından karşılanır.</li>
            <li>- Hijyen nedeniyle kişisel kullanım izli ürünlerde iade kabul edilmeyebilir.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[#e5d6bf]/80 bg-white/85 p-5 shadow-[0_8px_20px_rgba(62,53,42,0.05)] sm:p-6">
          <h2 className="font-serif text-xl text-stone-900">Ödeme</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
            <li>- Kredi Kartı / Banka Kartı ile ödeme yapılabilir.</li>
            <li>- Havale / EFT ile ödeme yapılabilir.</li>
            <li>- Kapıda ödeme bulunmamaktadır.</li>
            <li>- Taksit, anlaşmalı ödeme kuruluşunun sunduğu kartlarda geçerlidir.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[#e5d6bf]/90 bg-[linear-gradient(160deg,#fffdfa_0%,#f9f2e7_100%)] p-5 shadow-[0_10px_24px_rgba(62,53,42,0.07)] sm:p-6">
          <h2 className="font-serif text-xl text-stone-900">Destek</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            İade süreciyle ilgili hızlı destek için bizimle WhatsApp üzerinden iletişime geçebilirsin.
          </p>
          <a
            href={supportHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d2b176]/90 bg-[linear-gradient(135deg,#ead4aa_0%,#d9b87b_100%)] px-4 py-2.5 text-sm font-semibold text-[#34291f] shadow-[0_10px_24px_rgba(198,161,91,0.24)] transition hover:scale-[1.015] hover:brightness-[0.98] hover:shadow-[0_14px_30px_rgba(198,161,91,0.32)]"
          >
            <Image src="/WhatsApp.svg" alt="" width={18} height={18} className="shrink-0" aria-hidden />
            WhatsApp&apos;tan hızlı destek al ✨
          </a>
          <p className="mt-1.5 text-xs text-stone-500">Genelde birkaç dakika içinde cevaplıyoruz</p>
        </section>
      </div>
    </main>
  );
}
