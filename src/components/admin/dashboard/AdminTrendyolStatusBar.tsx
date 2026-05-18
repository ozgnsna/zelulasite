import Link from "next/link";

export function AdminTrendyolStatusBar({
  isActive,
  environment,
  sellerId,
  linkedCount,
  readyCount,
  missingCount,
  lastLogAt,
}: {
  isActive: boolean;
  environment: string;
  sellerId: string | null;
  linkedCount: number;
  readyCount: number;
  missingCount: number;
  lastLogAt: string | null;
}) {
  const connectionOk = isActive && Boolean(sellerId?.trim());

  return (
    <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Bağlantı"
        value={connectionOk ? "Hazır" : "Eksik ayar"}
        tone={connectionOk ? "ok" : "warn"}
        hint={connectionOk ? `${environment} · Satıcı ${sellerId}` : "API bilgilerini kaydedin"}
        href="#trendyol-ayarlar"
      />
      <StatCard
        label="Trendyol bağlı ürün"
        value={String(linkedCount)}
        tone="neutral"
        hint="Barkod tanımlı kayıtlar"
        href="#trendyol-urunler"
      />
      <StatCard
        label="Gönderime hazır"
        value={String(readyCount)}
        tone={readyCount > 0 ? "ok" : "neutral"}
        hint={missingCount > 0 ? `${missingCount} üründe eksik alan` : "Zorunlu alanlar tamam"}
        href="#trendyol-urunler"
      />
      <StatCard
        label="Son işlem"
        value={lastLogAt ? formatRelative(lastLogAt) : "—"}
        tone="neutral"
        hint={lastLogAt ? new Date(lastLogAt).toLocaleString("tr-TR") : "Henüz log yok"}
        href="#trendyol-loglar"
      />
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "ok" | "warn" | "neutral";
  href: string;
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-200/80 bg-emerald-50/50"
      : tone === "warn"
        ? "border-amber-200/80 bg-amber-50/40"
        : "border-[#e7ded2]/90 bg-white";

  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition hover:shadow-md ${toneClass}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-1 font-serif text-2xl font-light text-stone-900">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-stone-500 group-hover:text-stone-600">{hint}</p>
    </Link>
  );
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}
