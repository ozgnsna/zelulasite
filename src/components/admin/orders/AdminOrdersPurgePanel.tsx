import { purgeAllOrdersAndResetCounterAction } from "@/app/actions/admin";
import { AdminTrendyolSubmitButton } from "@/components/admin/dashboard/AdminTrendyolSubmitButton";

export function AdminOrdersPurgePanel({
  purgeOk,
  purgeCount,
  purgeErr,
}: {
  purgeOk?: string;
  purgeCount?: string;
  purgeErr?: string;
}) {
  const ok = String(purgeOk ?? "").trim() === "1";
  const count = String(purgeCount ?? "").trim();
  const err = String(purgeErr ?? "").trim();
  const openByDefault = Boolean(ok || err);

  return (
    <details
      className="group mt-6 rounded-xl border border-rose-200/50 bg-rose-50/25 open:border-rose-200/80 open:bg-rose-50/40"
      open={openByDefault}
    >
      <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-900/90">
              Test verisi temizleme
            </p>
            <p className="mt-0.5 text-[10px] text-rose-950/75">
              Yalnızca geliştirme / test — tüm siparişleri siler, sayaç ZLL0001 olur.
            </p>
          </div>
          <span className="rounded-full border border-rose-200/80 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-rose-800 group-open:hidden">
            Aç
          </span>
          <span className="hidden rounded-full border border-rose-200/80 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-rose-800 group-open:inline">
            Kapat
          </span>
        </div>
      </summary>

      <div className="border-t border-rose-200/50 px-4 pb-4 pt-3">
        <p className="text-[11px] leading-relaxed text-rose-950/90">
          Tüm siparişleri, ödeme loglarını ve siparişe bağlı puan/hediye kartı hareketlerini kalıcı olarak siler.
          Geri alınamaz.
        </p>

        {ok ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            {count || "0"} sipariş silindi. Sayaç sıfırlandı; yeni siparişler ZLL0001 ile başlar.
          </p>
        ) : null}
        {err ? (
          <p className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs text-rose-900">{err}</p>
        ) : null}

        <form action={purgeAllOrdersAndResetCounterAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-0 flex-1 sm:max-w-xs">
            <span className="mb-1 block text-[10px] font-medium text-rose-900">Onay için kutuya SIFIRLA yazın</span>
            <input
              name="confirm_purge"
              type="text"
              autoComplete="off"
              placeholder="SIFIRLA"
              className="w-full rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-sm text-stone-900"
            />
          </label>
          <AdminTrendyolSubmitButton
            variant="primary"
            pendingLabel="Siliniyor…"
            className="w-full shrink-0 border-rose-800 bg-rose-900 text-white hover:bg-rose-800 sm:w-auto"
          >
            Tüm siparişleri sil ve sayacı sıfırla
          </AdminTrendyolSubmitButton>
        </form>
      </div>
    </details>
  );
}
