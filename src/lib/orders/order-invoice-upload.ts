import type { SupabaseClient } from "@supabase/supabase-js";

export const ORDER_INVOICE_BUCKET = "product-images";
export const ORDER_INVOICE_MAX_BYTES = 10_000_000;

export function isAllowedOrderInvoicePdf(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "application/pdf") return true;
  return /\.pdf$/i.test(file.name);
}

function storageObjectPathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(publicUrl.slice(i + marker.length).split("?")[0] ?? "");
}

export async function uploadOrderInvoicePdf(
  admin: SupabaseClient,
  params: { orderId: string; file: File },
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { orderId, file } = params;
  const id = String(orderId ?? "").trim();
  if (!id) return { ok: false, error: "Sipariş bulunamadı." };

  if (!isAllowedOrderInvoicePdf(file)) {
    return { ok: false, error: "Yalnızca PDF yükleyebilirsiniz." };
  }
  if (file.size > ORDER_INVOICE_MAX_BYTES) {
    return { ok: false, error: "PDF en fazla 10 MB olabilir." };
  }

  const path = `invoices/${id}/${Date.now()}.pdf`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage.from(ORDER_INVOICE_BUCKET).upload(path, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (uploadError) {
    return { ok: false, error: uploadError.message || "PDF yüklenemedi." };
  }

  const { data } = admin.storage.from(ORDER_INVOICE_BUCKET).getPublicUrl(path);
  const url = String(data.publicUrl ?? "").trim();
  if (!url) return { ok: false, error: "PDF adresi oluşturulamadı." };
  return { ok: true, url };
}

export async function removeOrderInvoicePdfFromStorage(
  admin: SupabaseClient,
  invoicePdfUrl: string | null | undefined,
): Promise<void> {
  const url = String(invoicePdfUrl ?? "").trim();
  if (!url) return;
  const objectPath = storageObjectPathFromPublicUrl(url, ORDER_INVOICE_BUCKET);
  if (!objectPath || !objectPath.startsWith("invoices/")) return;
  await admin.storage.from(ORDER_INVOICE_BUCKET).remove([objectPath]);
}
