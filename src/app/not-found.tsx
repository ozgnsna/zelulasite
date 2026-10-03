import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sayfa bulunamadı",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">404</p>
      <h1 className="mt-3 font-serif text-3xl font-light text-stone-900">Sayfa bulunamadı</h1>
      <p className="mt-3 text-sm text-stone-600">
        Aradığınız sayfa yok veya taşınmış olabilir.
      </p>
      <Link
        href="/urunler"
        className="mt-8 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
      >
        Tüm ürünlere dön
      </Link>
    </main>
  );
}
