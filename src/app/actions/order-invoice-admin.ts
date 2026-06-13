"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { removeOrderInvoicePdfFromStorage, uploadOrderInvoicePdf } from "@/lib/orders/order-invoice-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertAdminSession() {
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
}

function revalidateOrderInvoicePaths(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/hesabim");
  revalidatePath(`/hesabim/siparis/${orderId}`);
}

export async function uploadOrderInvoicePdfAction(formData: FormData) {
  await assertAdminSession();

  const orderId = String(formData.get("orderId") ?? "").trim();
  const file = formData.get("invoice");
  const returnTo = String(formData.get("returnTo") ?? "").trim() || `/admin/orders/${orderId}`;

  if (!orderId) redirect(`${returnTo}?invoiceError=${encodeURIComponent("Sipariş bulunamadı.")}`);
  if (!(file instanceof File) || file.size === 0) {
    redirect(`${returnTo}?invoiceError=${encodeURIComponent("PDF dosyası seçin.")}`);
  }

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("invoice_pdf_url").eq("id", orderId).maybeSingle();
  if (!order) redirect(`${returnTo}?invoiceError=${encodeURIComponent("Sipariş bulunamadı.")}`);

  const uploaded = await uploadOrderInvoicePdf(admin, { orderId, file });
  if (!uploaded.ok) {
    redirect(`${returnTo}?invoiceError=${encodeURIComponent(uploaded.error)}`);
  }

  if (order.invoice_pdf_url && order.invoice_pdf_url !== uploaded.url) {
    await removeOrderInvoicePdfFromStorage(admin, String(order.invoice_pdf_url));
  }

  const { error } = await admin
    .from("orders")
    .update({
      invoice_pdf_url: uploaded.url,
      invoice_uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    redirect(`${returnTo}?invoiceError=${encodeURIComponent("Fatura kaydedilemedi.")}`);
  }

  revalidateOrderInvoicePaths(orderId);
  redirect(`${returnTo}?invoiceOk=1`);
}

export async function removeOrderInvoicePdfAction(formData: FormData) {
  await assertAdminSession();

  const orderId = String(formData.get("orderId") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim() || `/admin/orders/${orderId}`;
  if (!orderId) redirect(`${returnTo}?invoiceError=${encodeURIComponent("Sipariş bulunamadı.")}`);

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("invoice_pdf_url").eq("id", orderId).maybeSingle();
  if (!order) redirect(`${returnTo}?invoiceError=${encodeURIComponent("Sipariş bulunamadı.")}`);

  await removeOrderInvoicePdfFromStorage(admin, String(order.invoice_pdf_url ?? ""));

  const { error } = await admin
    .from("orders")
    .update({
      invoice_pdf_url: null,
      invoice_uploaded_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    redirect(`${returnTo}?invoiceError=${encodeURIComponent("Fatura kaldırılamadı.")}`);
  }

  revalidateOrderInvoicePaths(orderId);
  redirect(`${returnTo}?invoiceOk=1`);
}
