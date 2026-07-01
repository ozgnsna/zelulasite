import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { ADMIN_OPERATIONS_MAIN } from "@/lib/admin/admin-shell-layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchGiftCardAdminSummary } from "@/lib/gift-cards/admin-summary";
import { formatTry } from "@/lib/money";

export const dynamic = "force-dynamic";

const GIFT_CARD_ADMIN_THEME = {
  "--surface-1": "var(--surface)",
  "--text-muted": "#a8a29e",
  "--radius": "8px",
} as CSSProperties;

function GiftCardKpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: "var(--surface-1)",
        padding: "10px 14px",
        borderRadius: "var(--radius)",
      }}
    >
      <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="mt-1 text-[20px] font-medium tabular-nums" style={{ color: "var(--foreground, #2d2521)", lineHeight: 1.2 }}>
        {value}
      </p>
    </div>
  );
}

export default async function AdminGiftCardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? "")) redirect("/admin/login");

  const admin = createAdminClient();
  const summary = await fetchGiftCardAdminSummary(admin);

  return (
    <main
      className={`${ADMIN_OPERATIONS_MAIN} py-8 sm:py-10 lg:py-12`}
      style={GIFT_CARD_ADMIN_THEME}
    >
      <header className="border-b border-stone-200/55 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Hediye kartları</p>
        <h1 className="mt-1 font-serif text-2xl font-light text-stone-900 sm:text-3xl">Dijital hediye kartları</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Üretilen kartlar, kalan bakiyeler ve satışa açık tutarlar.
        </p>
      </header>

      {summary.loadError ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
          Veri yüklenemedi: {summary.loadError}. Supabase migration’larını uyguladığınızdan emin olun.
        </p>
      ) : null}

      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        <GiftCardKpiCard label="Üretilen kart" value={summary.issuedCount.toLocaleString("tr-TR")} />
        <GiftCardKpiCard label="Aktif kart" value={summary.activeCount.toLocaleString("tr-TR")} />
        <GiftCardKpiCard label="Dolaşımdaki bakiye" value={formatTry(summary.outstandingBalanceTry)} />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-700">Satış tutarları</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
          <table className="w-full min-w-[24rem] text-left text-sm">
            <thead className="border-b border-stone-100 bg-stone-50/80 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tutar</th>
                <th className="px-4 py-3 font-medium">Ürün bağlantısı</th>
                <th className="px-4 py-3 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {summary.denominations.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-stone-500">
                    Henüz yüz değer tanımı yok.{" "}
                    <code className="rounded bg-stone-100 px-1 text-xs">20260517120000_gift_cards.sql</code> migration’ını
                    çalıştırın.
                  </td>
                </tr>
              ) : (
                summary.denominations.map((d) => (
                  <tr key={d.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 font-medium text-stone-900">{formatTry(d.amount)}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {d.productId ? (
                        <Link href={`/admin/products/${d.productId}/edit`} className="underline-offset-2 hover:underline">
                          Ürünü düzenle
                        </Link>
                      ) : (
                        <span className="text-amber-800">Ürün yok — seed migration çalıştırın</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          d.isConfigured
                            ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
                            : "inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900"
                        }
                      >
                        {d.isConfigured ? "Satışta" : "Yapılandırılmadı"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Link href="/admin" className="mt-8 inline-flex text-sm font-semibold text-stone-800 underline-offset-2 hover:underline">
        Kontrol paneline dön
      </Link>
    </main>
  );
}
