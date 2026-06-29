import Link from "next/link";

type Props = {
  outOfStockCount: number;
  lowStockCount: number;
  notListedOnMarketplaceCount: number;
};

function HealthRow({ label, href, tone }: { label: string; href: string; tone: "rose" | "amber" | "stone" }) {
  const toneClass =
    tone === "rose"
      ? "bg-rose-50/80 ring-rose-200/60 hover:bg-rose-50"
      : tone === "amber"
        ? "bg-amber-50/80 ring-amber-200/60 hover:bg-amber-50"
        : "bg-stone-50 ring-stone-200/60 hover:bg-stone-100/80";

  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ring-1 transition ${toneClass}`}
    >
      <span className="text-[13px] font-medium text-stone-800">{label}</span>
    </Link>
  );
}

export function ProductHealthPanel({ outOfStockCount, lowStockCount, notListedOnMarketplaceCount }: Props) {
  return (
    <section className="rounded-2xl border border-stone-200/60 bg-white/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Ürün sağlığı</h2>
          <p className="mt-0.5 text-[11px] text-stone-500">Tüm aktif katalog · satıra tıklayınca filtreli liste</p>
        </div>
        <Link href="/admin/products" className="text-[11px] font-semibold text-[#8a734f] underline-offset-2 hover:underline">
          Katalog
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        <li>
          <HealthRow
            label={`Stokta yok: ${outOfStockCount.toLocaleString("tr-TR")}`}
            href="/admin/products?status=active&stock=out"
            tone="rose"
          />
        </li>
        <li>
          <HealthRow
            label={`Az stok: ${lowStockCount.toLocaleString("tr-TR")}`}
            href="/admin/products?status=active&stock=low"
            tone="amber"
          />
        </li>
        <li>
          <HealthRow
            label={`Trendyol'da yok: ${notListedOnMarketplaceCount.toLocaleString("tr-TR")}`}
            href="/admin/products?status=active&trendyol=missing"
            tone="stone"
          />
        </li>
      </ul>
    </section>
  );
}
