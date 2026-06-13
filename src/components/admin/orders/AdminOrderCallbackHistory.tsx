import {
  callbackEventKindLabelTr,
  callbackLogStatusLabelTr,
  callbackPublicSummary,
  callbackVerificationLabelTr,
} from "@/lib/admin/order-callback-copy";

type PaymentLogRow = {
  id: string;
  provider?: string | null;
  event_type: string | null;
  status: string;
  verification_status: string | null;
  verification_error?: string | null;
  reference: string | null;
  callback_hash: string | null;
  created_at: string;
  callback_payload: unknown;
  request_payload: unknown;
  response_payload?: unknown;
};

function customerWhatsAppDetail(log: PaymentLogRow): string | null {
  if (String(log.provider ?? "") !== "internal_customer_whatsapp") return null;
  const payload = log.response_payload as
    | { attempted?: boolean; ok?: boolean; error?: string; skippedReason?: string }
    | null
    | undefined;
  if (!payload) return log.verification_error ?? null;
  const event = String(log.event_type ?? "");
  const label =
    event === "order_paid"
      ? "Müşteri WA · sipariş alındı"
      : event === "order_shipped"
        ? "Müşteri WA · kargoda"
        : event === "order_delivered"
          ? "Müşteri WA · teslim"
          : "Müşteri WA";
  return `${label}: ${payload.ok ? "gitti" : payload.attempted ? "hata" : "atlandı"}${payload.error ? ` (${payload.error})` : payload.skippedReason ? ` (${payload.skippedReason})` : ""}`;
}

function adminNotifyDetail(log: PaymentLogRow): string | null {
  if (String(log.event_type ?? "").toLowerCase() !== "admin_notify") return null;
  const payload = log.response_payload as
    | {
        email?: { attempted?: boolean; ok?: boolean; error?: string; skippedReason?: string };
        whatsapp?: { attempted?: boolean; ok?: boolean; error?: string; skippedReason?: string };
      }
    | null
    | undefined;
  if (!payload) return log.verification_error ?? null;

  const parts: string[] = [];
  const e = payload.email;
  const w = payload.whatsapp;
  if (e) {
    parts.push(
      `E-posta: ${e.ok ? "gitti" : e.attempted ? "hata" : "atlandı"}${e.error ? ` (${e.error})` : e.skippedReason ? ` (${e.skippedReason})` : ""}`,
    );
  }
  if (w) {
    parts.push(
      `WhatsApp: ${w.ok ? "gitti" : w.attempted ? "hata" : "atlandı"}${w.error ? ` (${w.error})` : w.skippedReason ? ` (${w.skippedReason})` : ""}`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : (log.verification_error ?? null);
}

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
              const notifyLine = customerWhatsAppDetail(log) ?? adminNotifyDetail(log);
              const rawPayload =
                log.response_payload ?? log.callback_payload ?? log.request_payload ?? {};
              const payloadLabel =
                log.response_payload != null ? "Yanıt / bildirim detayı" : "Ham callback payload";
              return (
                <li key={log.id} className="rounded-xl border border-[#e8dfd3]/70 bg-white px-4 py-3">
                  <p className="text-sm font-semibold text-stone-900">{kind}</p>
                  <p className="mt-1 text-xs text-stone-600">
                    Bildirim: <span className="font-medium text-stone-800">{st}</span>
                    <span className="mx-2 text-stone-300">·</span>
                    Doğrulama: <span className="font-medium text-stone-800">{ver}</span>
                  </p>
                  {notifyLine ? (
                    <p className="mt-2 text-xs leading-relaxed text-stone-700">{notifyLine}</p>
                  ) : null}
                  {log.verification_error && !notifyLine ? (
                    <p className="mt-2 text-xs text-amber-900">{log.verification_error}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] tabular-nums text-stone-500">
                    {new Date(log.created_at).toLocaleString("tr-TR")}
                  </p>
                  <details className="mt-2 rounded-lg border border-stone-200/90 bg-white transition-colors open:border-stone-300">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50">
                      {payloadLabel}
                    </summary>
                    <pre className="max-h-48 overflow-auto border-t border-stone-100 p-3 font-mono text-[10px] leading-relaxed text-stone-700">
                      {JSON.stringify(rawPayload, null, 2)}
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
