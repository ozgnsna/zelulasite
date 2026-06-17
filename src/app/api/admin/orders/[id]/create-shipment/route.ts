import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notifyCustomerOrderWhatsApp } from "@/lib/notifications/order-customer-whatsapp";
import { createShipmentForOrder } from "@/lib/shipping/provider";
import type { OrderShippingSource } from "@/lib/shipping/types";

function isAdminSession(email: string | undefined): boolean {
  if (!email?.trim()) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return true;
  return list.includes(email.toLowerCase());
}

function hasExistingShipment(row: Record<string, unknown>): boolean {
  const track = String(row.shipping_tracking_number ?? "").trim();
  if (track.length > 0) return true;
  const st = String(row.shipping_status ?? "").trim();
  if (st === "created") return true;
  return false;
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await ctx.params;
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Sipariş kimliği gerekli." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAdminSession(user.email)) {
    return NextResponse.json({ ok: false, error: "Yetkisiz." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: order, error: fetchErr } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (fetchErr || !order) {
    return NextResponse.json({ ok: false, error: "Sipariş bulunamadı." }, { status: 404 });
  }

  const row = order as Record<string, unknown>;
  if (String(row.payment_status ?? "") !== "paid") {
    return NextResponse.json(
      { ok: false, error: "Ödeme tamamlanmamış sipariş için kargo oluşturulamaz." },
      { status: 400 },
    );
  }

  if (hasExistingShipment(row)) {
    return NextResponse.json({ ok: false, error: "Bu sipariş için kargo kaydı zaten mevcut." }, { status: 409 });
  }

  const source: OrderShippingSource = {
    id: String(row.id),
    order_number: String(row.order_number ?? ""),
    customer_name: String(row.customer_name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    payment_status: row.payment_status == null ? null : String(row.payment_status),
    shipping_address_json: row.shipping_address_json,
  };

  const result = await createShipmentForOrder(source);
  if (!result.ok) {
    const notConfigured = result.code === "DHL_NOT_CONFIGURED" || result.code === "NAVLUNGO_NOT_CONFIGURED";
    return NextResponse.json(
      { ok: false, error: result.error, code: result.code },
      { status: notConfigured ? 501 : 400 },
    );
  }

  const now = new Date().toISOString();
  const { error: updErr } = await admin
    .from("orders")
    .update({
      order_status: "shipped",
      shipping_provider: result.provider,
      shipping_tracking_number: result.trackingNumber,
      shipping_label_url: result.labelUrl,
      shipping_status: result.shippingStatus,
      shipping_created_at: now,
      updated_at: now,
    })
    .eq("id", orderId);

  if (updErr) {
    return NextResponse.json({ ok: false, error: "Sipariş güncellenemedi.", detail: updErr.message }, { status: 500 });
  }

  await notifyCustomerOrderWhatsApp(admin, orderId, "order_shipped", {
    trackingNumber: result.trackingNumber,
  });

  return NextResponse.json({
    ok: true,
    provider: result.provider,
    trackingNumber: result.trackingNumber,
    labelUrl: result.labelUrl,
    shippingStatus: result.shippingStatus,
    shippingCreatedAt: now,
  });
}
