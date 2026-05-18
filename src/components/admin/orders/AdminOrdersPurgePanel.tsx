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

  return (
    <section className="mt-8 rounded-xl border border-rose-200/80 bg-rose-50/40 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-rose-900">Tehlikeli bölge</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-rose-950/90">
        Tüm siparişleri, ödeme loglarını ve siparişe bağlı puan/hediye kartı hareketlerini siler. Sıradaki sipariş numarası{" "}
        <span className="font-mono font-semibold">ZLL0001</span> olur. Geri alınamaz — yalnızca test verisi için kullanın.
      </p>

      {ok ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {count || "0"} sipariş silindi. Sayaç sıfırlandı; yeni siparişler ZLL0001 ile başlar.
        </p>
      ) : null}
      {err ? (
        <p className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs text-rose-900">{err}</p>
      ) : null}

      <form action={purgeAllOrdersAndResetCounterAction} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="block min-w-[200px] flex-1">
          <span className="mb-1 block text-[10px] font-medium text-rose-900">Onay: SIFIRLA yazın</span>
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
          className="border-rose-800 bg-rose-900 text-white hover:bg-rose-800"
        >
          Tüm siparişleri sil ve sayacı sıfırla
        </AdminTrendyolSubmitButton>
      </form>
    </section>
  );
}
