import type { Metadata } from "next";
import Link from "next/link";
import { Gift } from "lucide-react";
import { GiftCardPurchaseForm } from "@/components/gift-cards/GiftCardPurchaseForm";
import { listActiveGiftCardDenominations } from "@/lib/gift-cards/denominations";

export const metadata: Metadata = {
  title: "Dijital Hediye Kartı",
  description: "500 ₺, 750 ₺ ve 1000 ₺ Zelula dijital hediye kartı — kod alıcı e-postasına iletilir.",
};

export default async function HediyeKartiPage() {
  const denominations = await listActiveGiftCardDenominations();

  return (
    <main className="container-premium py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="editorial-kicker">Hediye</p>
          <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#e8dfd3] bg-[linear-gradient(165deg,#fffdfb_0%,#f5efe4_100%)] text-[color:var(--brand-gold)] shadow-sm">
            <Gift className="h-7 w-7" strokeWidth={1.5} aria-hidden />
          </div>
          <h1 className="mt-6 font-serif text-4xl font-light text-stone-900 sm:text-5xl">Dijital Hediye Kartı</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
            Sevdiklerinize Zelula dokunuşu hediye edin. Ödeme sonrası benzersiz kod alıcının e-postasına gider; kod sepette
            bakiye düşerek kullanılabilir.
          </p>
        </div>

        <div className="mt-12 lg:mt-14">
          <GiftCardPurchaseForm denominations={denominations} />
        </div>

        <ul className="mt-14 grid gap-4 border-t border-[#e8dfd3]/80 pt-10 text-sm text-stone-600 sm:grid-cols-3">
          <li className="rounded-xl bg-[#faf8f5]/80 px-4 py-3">
            <span className="font-medium text-stone-800">Anında teslim</span>
            <p className="mt-1 text-xs leading-relaxed">Ödeme onayından sonra e-posta ile kod.</p>
          </li>
          <li className="rounded-xl bg-[#faf8f5]/80 px-4 py-3">
            <span className="font-medium text-stone-800">Kısmi kullanım</span>
            <p className="mt-1 text-xs leading-relaxed">Kalan bakiye sonraki alışverişlerde geçerli.</p>
          </li>
          <li className="rounded-xl bg-[#faf8f5]/80 px-4 py-3">
            <span className="font-medium text-stone-800">Kargo yok</span>
            <p className="mt-1 text-xs leading-relaxed">Tamamen dijital; fiziksel gönderim olmaz.</p>
          </li>
        </ul>

        <p className="mt-10 text-center text-xs text-stone-500">
          <Link href="/urunler" className="underline-offset-2 hover:underline">
            Takı koleksiyonuna göz at
          </Link>
        </p>
      </div>
    </main>
  );
}
