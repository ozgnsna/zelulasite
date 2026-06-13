import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { removeOrderInvoicePdfAction, uploadOrderInvoicePdfAction } from "@/app/actions/order-invoice-admin";

function formatWhen(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminOrderInvoicePanel({
  orderId,
  orderNumber,
  invoicePdfUrl,
  invoiceUploadedAt,
  invoiceOk,
  invoiceError,
}: {
  orderId: string;
  orderNumber: string;
  invoicePdfUrl: string | null;
  invoiceUploadedAt: string | null;
  invoiceOk?: boolean;
  invoiceError?: string | null;
}) {
  const returnTo = `/admin/orders/${orderId}`;
  const hasInvoice = Boolean(invoicePdfUrl?.trim());

  return (
    <section className="rounded-[20px] border border-[#dfd2c4]/95 bg-white p-5 shadow-[0_2px_28px_-6px_rgba(45,37,33,0.08)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5ede1] text-[#8a6a3d]">
          <FileText className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">Müşteri faturası</h2>
          <p className="mt-1 text-sm text-stone-600">
            Trendyol / e-Fatura PDF&apos;ini yükle; müşteri hesabından indirebilir.
          </p>
        </div>
      </div>

      {invoiceOk ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Fatura kaydedildi.
        </p>
      ) : null}
      {invoiceError ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {invoiceError}
        </p>
      ) : null}

      {hasInvoice ? (
        <div className="mt-4 rounded-xl border border-[#eadfce] bg-[#fffdfb] px-4 py-3">
          <p className="text-sm font-medium text-stone-900">Yüklü fatura</p>
          {invoiceUploadedAt ? (
            <p className="mt-0.5 text-xs text-stone-500">Yüklendi: {formatWhen(invoiceUploadedAt)}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={invoicePdfUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
            >
              PDF&apos;i aç
            </Link>
            <form action={removeOrderInvoicePdfAction}>
              <input type="hidden" name="orderId" value={orderId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button
                type="submit"
                className="inline-flex rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
              >
                Kaldır
              </button>
            </form>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-stone-500">Henüz fatura yüklenmedi.</p>
      )}

      <form action={uploadOrderInvoicePdfAction} className="mt-4 space-y-3 border-t border-[#eadfce] pt-4">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            {hasInvoice ? "Faturayı değiştir (PDF)" : "Fatura yükle (PDF)"}
          </span>
          <input
            type="file"
            name="invoice"
            accept="application/pdf,.pdf"
            required={!hasInvoice}
            className="mt-2 block w-full max-w-md text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-stone-800"
          />
        </label>
        <p className="text-xs text-stone-500">En fazla 10 MB · yalnızca PDF</p>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-[#8a734f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#75633f]"
        >
          <Upload className="size-4" aria-hidden />
          {hasInvoice ? "Yeni PDF yükle" : "Faturayı kaydet"}
        </button>
      </form>
      <p className="mt-2 text-[11px] text-stone-500">Dosya adı önerisi: Zelula-{orderNumber}.pdf</p>
    </section>
  );
}
