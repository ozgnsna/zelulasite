import Link from "next/link";

const STEPS = [
  { n: 1, title: "Bağlantı", desc: "API ve satıcı bilgileri", hash: "#trendyol-ayarlar" },
  { n: 2, title: "İçe aktar", desc: "Trendyol'dan ürün çek", hash: "#trendyol-islemler" },
  { n: 3, title: "Hazırla", desc: "Kategori, marka, görsel", hash: "#trendyol-urunler" },
  { n: 4, title: "Gönder", desc: "Hazır ürünleri yükle", hash: "#trendyol-urunler" },
] as const;

export function AdminTrendyolWorkflowSteps({ connectionOk, readyCount }: { connectionOk: boolean; readyCount: number }) {
  const done = [connectionOk, connectionOk, readyCount > 0, false];

  return (
    <nav aria-label="Trendyol iş akışı" className="mb-8 rounded-2xl border border-[#e7ded2]/80 bg-[#faf8f5]/80 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Önerilen sıra</p>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.n}>
            <Link
              href={step.hash}
              className="flex gap-3 rounded-xl border border-transparent p-2 transition hover:border-stone-200 hover:bg-white"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done[i] ? "bg-emerald-600 text-white" : "border border-stone-300 bg-white text-stone-600"
                }`}
              >
                {done[i] ? "✓" : step.n}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-stone-800">{step.title}</span>
                <span className="block text-[11px] text-stone-500">{step.desc}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
