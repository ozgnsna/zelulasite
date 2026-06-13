import { FileText } from "lucide-react";

export function OrderInvoiceSection({
  orderNumber,
  invoicePdfUrl,
  invoiceUploadedAt,
  paymentStatus,
}: {
  orderNumber: string;
  invoicePdfUrl: string | null;
  invoiceUploadedAt: string | null;
  paymentStatus: string;
}) {
  const url = String(invoicePdfUrl ?? "").trim();
  if (!url || paymentStatus !== "paid") return null;

  const uploadedLabel = invoiceUploadedAt
    ? new Date(invoiceUploadedAt).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const downloadName = `Zelula-Fatura-${orderNumber.replace(/[^\w.-]+/g, "-")}.pdf`;

  return (
    <section className="mt-8 rounded-2xl border border-[#e8dfd3] bg-[#fffdfb] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5ede1] text-[#8a734f]">
          <FileText className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg text-stone-900">Faturanız</h2>
          <p className="mt-1 text-sm text-stone-600">
            Sipariş faturanız PDF olarak hazır.{uploadedLabel ? ` (${uploadedLabel})` : ""}
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={downloadName}
            className="mt-4 inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
          >
            Faturayı indir (PDF)
          </a>
        </div>
      </div>
    </section>
  );
}
