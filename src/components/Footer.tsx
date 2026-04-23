import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#e6dccf] bg-[#f8f3ec]">
      <div className="container-premium grid gap-8 py-12 md:grid-cols-4">
        <div>
          <p className="font-serif text-2xl text-stone-900">Zelula</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-600">
            Günlük ışıltını tamamlayan seçkiler. Zamansız tasarım, modern dokunuş.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-stone-600">
          <p className="font-medium text-stone-900">Mağaza</p>
          <Link href="/urunler" className="hover:text-stone-900">
            Ürünler
          </Link>
          <Link href="/koleksiyonlar" className="hover:text-stone-900">
            Koleksiyonlar
          </Link>
        </div>
        <div className="flex flex-col gap-2 text-sm text-stone-600">
          <p className="font-medium text-stone-900">Destek</p>
          <span>Kargo ve İade</span>
          <span>Bakım Rehberi</span>
        </div>
        <div className="flex flex-col gap-2 text-sm text-stone-600">
          <p className="font-medium text-stone-900">İletişim</p>
          <span>hello@zelula.com</span>
          <span>+90 555 000 00 00</span>
        </div>
      </div>
      <div className="border-t border-[#e5dbce] py-4 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} Zelula — demo mağaza
      </div>
    </footer>
  );
}
