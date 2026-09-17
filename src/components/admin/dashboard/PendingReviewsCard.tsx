import Link from "next/link";

type Props = {
  pendingCount: number;
};

export function PendingReviewsCard({ pendingCount }: Props) {
  const count = Math.max(0, Math.floor(pendingCount));

  return (
    <section className="rounded-2xl border border-stone-200/60 bg-white/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Bekleyen yorumlar</h2>
          <p className="mt-0.5 text-[11px] text-stone-500">Onay sonrası vitrinde ve puan kazandırır</p>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
              {count.toLocaleString("tr-TR")}
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
              Temiz
            </span>
          )}
          <Link
            href="/admin/reviews?status=pending"
            className="text-[11px] font-semibold text-[#8a734f] underline-offset-2 hover:underline"
          >
            Yorumlar
          </Link>
        </div>
      </div>

      {count === 0 ? (
        <p className="mt-3 text-[13px] text-stone-600">İncelenecek yorum yok.</p>
      ) : (
        <>
          <p className="mt-3 text-[13px] font-medium text-amber-950">
            {count.toLocaleString("tr-TR")} yorum onay bekliyor
          </p>
          <Link
            href="/admin/reviews?status=pending"
            className="mt-3 inline-flex text-[12px] font-semibold text-stone-800 underline-offset-2 hover:underline"
          >
            Moderasyona git →
          </Link>
        </>
      )}
    </section>
  );
}
