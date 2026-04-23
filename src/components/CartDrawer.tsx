"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatTry } from "@/lib/money";

type DrawerLine = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  quantity: number;
  price: number;
};

export function CartDrawer({
  count,
  lines,
}: {
  count: number;
  lines: DrawerLine[];
}) {
  const [open, setOpen] = useState(false);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-800 shadow-sm transition hover:border-stone-300"
      >
        Sepet
        {count > 0 ? (
          <span className="grid min-h-[1.25rem] min-w-[1.25rem] place-content-center rounded-full bg-stone-900 px-1 text-xs font-medium text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setOpen(false)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-full max-w-md border-l border-[#e8dece] bg-[#fffdfb] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">Sepetim</h2>
              <button className="text-sm text-stone-500 hover:text-stone-800" onClick={() => setOpen(false)}>
                Kapat
              </button>
            </div>
            <div className="mt-5 space-y-3 overflow-y-auto pb-36">
              {lines.length === 0 ? (
                <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
                  Sepetiniz boş.
                </p>
              ) : (
                lines.map((line) => (
                  <Link
                    key={line.productId}
                    href={`/urunler/${line.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3"
                    onClick={() => setOpen(false)}
                  >
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-stone-100">
                      <Image src={line.imageUrl} alt={line.name} fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.name}</p>
                      <p className="text-xs text-stone-500">{line.quantity} adet</p>
                    </div>
                    <p className="text-xs font-medium">{formatTry(line.price * line.quantity)}</p>
                  </Link>
                ))
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 border-t border-[#e8dece] bg-[#fffdfb] p-5">
              <p className="mb-2 text-xs text-stone-500">Sepetiniz hazır. Güvenli ödeme ile siparişinizi şimdi tamamlayın.</p>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-stone-600">Ara Toplam</span>
                <strong className="text-base text-stone-900">{formatTry(subtotal)}</strong>
              </div>
              <p className="mb-3 text-[11px] text-stone-500">Kargo ve ödeme seçenekleri bir sonraki adımda netleşir.</p>
              <Link
                href="/sepet"
                onClick={() => setOpen(false)}
                className="block rounded-full bg-stone-900 px-5 py-3.5 text-center text-sm font-semibold text-white shadow-[0_10px_20px_rgba(25,25,25,0.2)]"
              >
                Güvenli Ödemeye Geç
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
