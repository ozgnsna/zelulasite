import {
  callbackEventKindLabelTr,
  callbackLogStatusLabelTr,
  callbackPublicSummary,
  callbackVerificationLabelTr,
} from "@/lib/admin/order-callback-copy";

type PaymentLogRow = {
  id: string;
  event_type: string | null;
  status: string;
  verification_status: string | null;
  reference: string | null;
  callback_hash: string | null;
  created_at: string;
  callback_payload: unknown;
  request_payload: unknown;
};

const card =
  "rounded-[20px] border border-[#dfd2c4]/95 bg-white p-5 shadow-[0_2px_28px_-6px_rgba(45,37,33,0.07)] sm:p-5";

function toneBox(tone: "ok" | "warn" | "neutral") {
  if (tone === "ok") return "border-emerald-200/90 bg-emerald-50/45";
  if (tone === "warn") return "border-amber-200/90 bg-amber-50/45";
  return "border-[#e8dfd3] bg-[#fffdfb]";
}

export function AdminOrderCallbackHistory({
  logs,
  paymentStatus,
}: {
  logs: PaymentLogRow[];
  paymentStatus: string;
}) {
  if (!logs.length) {
    return (
      <section className={card}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">Ödeme bildirimleri</h2>
        <p className="mt-3 text-sm text-stone-600">Henüz bildirim kaydı yok.</p>
      </section>
    );
  }

  const latest = logs[0];
  const summary = callbackPublicSummary({ paymentStatus, latest });

  return (
    <section className={card}>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">Ödeme bildirimleri</h2>
      <p className="mt-1 text-xs text-stone-600">Sağlayıcı kayıtları — ayrıntılar aşağıda.</p>

      <div className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3.5 ${toneBox(summary.tone)}`}>
        <span className="mt-0.5 text-base leading-none text-stone-600" aria-hidden>
          {summary.tone === "ok" ? "✔" : summary.tone === "warn" ? "!" : "·"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900">{summary.title}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-stone-600">{summary.body}</p>
          <p className="mt-2 text-[11px] tabular-nums text-stone-600">
            Son kayıt: {new Date(latest.created_at).toLocaleString("tr-TR")}
          </p>
        </div>
      </div>

      <details className="group mt-5 rounded-xl border border-[#e8dfd3]/80 transition-colors open:border-[#d4c4b0] open:bg-[#fffdfb]/80">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 marker:hidden transition hover:bg-[#fffdfb] [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 text-sm font-medium text-stone-800">
            <span className="rounded-md bg-stone-900 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
              Dev
            </span>
            Kayıt geçmişi
          </span>
          <span
            className="text-stone-400 transition-transform duration-200 ease-out group-open:rotate-180"
            aria-hidden
          >
            ▼
          </span>
        </summary>
        <div className="border-t border-[#eadfce]/90 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <ul className="space-y-3">
            {logs.map((log) => {
              const kind = callbackEventKindLabelTr(log.event_type);
              const st = callbackLogStatusLabelTr(log.status);
              const ver = callbackVerificationLabelTr(log.verification_status);
              return (
                <li key={log.id} className="rounded-xl border border-[#e8dfd3]/70 bg-white px-4 py-3">
                  <p className="text-sm font-semibold text-stone-900">{kind}</p>
                  <p className="mt-1 text-xs text-stone-600">
                    Bildirim: <span className="font-medium text-stone-800">{st}</span>
                    <span className="mx-2 text-stone-300">·</span>
                    Doğrulama: <span className="font-medium text-stone-800">{ver}</span>
                  </p>
                  <p className="mt-1 text-[11px] tabular-nums text-stone-500">
                    {new Date(log.created_at).toLocaleString("tr-TR")}
                  </p>
                  <details className="mt-2 rounded-lg border border-stone-200/90 bg-white transition-colors open:border-stone-300">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50">
                      Ham callback payload
                    </summary>
                    <pre className="max-h-48 overflow-auto border-t border-stone-100 p-3 font-mono text-[10px] leading-relaxed text-stone-700">
                      {JSON.stringify(log.callback_payload ?? log.request_payload ?? {}, null, 2)}
                    </pre>
                  </details>
                </li>
              );
            })}
          </ul>
        </div>
      </details>
    </section>
  );
}
