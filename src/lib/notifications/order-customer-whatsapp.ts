import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getWhatsAppCloudConfig,
  getWhatsAppTemplateLanguage,
  normalizeWhatsAppPhone,
  sendWhatsAppTemplateMessage,
} from "@/lib/notifications/whatsapp-cloud";

export type CustomerWhatsAppEvent = "order_paid" | "order_shipped" | "order_delivered";

export type CustomerWhatsAppResult = {
  attempted: boolean;
  ok: boolean;
  error?: string;
  skippedReason?: string;
};

const TEMPLATE_ENV: Record<CustomerWhatsAppEvent, string> = {
  order_paid: "WHATSAPP_CUSTOMER_TEMPLATE_ORDER_PAID",
  order_shipped: "WHATSAPP_CUSTOMER_TEMPLATE_ORDER_SHIPPED",
  order_delivered: "WHATSAPP_CUSTOMER_TEMPLATE_ORDER_DELIVERED",
};

function templateNameFor(event: CustomerWhatsAppEvent): string | null {
  const name = process.env[TEMPLATE_ENV[event]]?.trim();
  return name || null;
}

function getSkipReason(event: CustomerWhatsAppEvent, phone: string): string | undefined {
  if (!getWhatsAppCloudConfig()) return "WHATSAPP_CLOUD_ACCESS_TOKEN veya PHONE_NUMBER_ID tanımlı değil";
  if (!normalizeWhatsAppPhone(phone)) return "Siparişte geçerli müşteri telefonu yok";
  if (!templateNameFor(event)) return `${TEMPLATE_ENV[event]} tanımlı değil (Meta şablon adı gerekli)`;
  return undefined;
}

/** WhatsApp URL düğmesi: …/siparis/{orderId}/basarili */
function orderButtonSuffix(orderId: string): string {
  return `${orderId}/basarili`;
}

function shipmentReference(orderNumber: string, trackingNumber?: string | null): string {
  const track = String(trackingNumber ?? "").trim();
  return track || orderNumber;
}

async function alreadySent(
  admin: SupabaseClient,
  orderId: string,
  event: CustomerWhatsAppEvent,
): Promise<boolean> {
  const { data } = await admin
    .from("payment_logs")
    .select("id")
    .eq("order_id", orderId)
    .eq("provider", "internal_customer_whatsapp")
    .eq("event_type", event)
    .eq("verification_status", "passed")
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function logCustomerWhatsApp(
  admin: SupabaseClient,
  orderId: string,
  event: CustomerWhatsAppEvent,
  orderNumber: string,
  result: CustomerWhatsAppResult,
): Promise<void> {
  await admin.from("payment_logs").insert({
    order_id: orderId,
    provider: "internal_customer_whatsapp",
    event_type: event,
    status: result.ok ? "sent" : result.attempted ? "failed" : "skipped",
    response_payload: result,
    callback_payload: null,
    callback_hash: null,
    reference: orderNumber,
    verification_status: result.ok ? "passed" : result.attempted ? "failed" : "skipped",
    verification_error: result.error || result.skippedReason || null,
    processed_at: new Date().toISOString(),
  });
}

export async function notifyCustomerOrderWhatsApp(
  admin: SupabaseClient,
  orderId: string,
  event: CustomerWhatsAppEvent,
  opts?: { trackingNumber?: string | null; force?: boolean },
): Promise<CustomerWhatsAppResult> {
  if (!opts?.force && (await alreadySent(admin, orderId, event))) {
    return { attempted: false, ok: false, skippedReason: "Bu bildirim daha önce gönderildi" };
  }

  const { data: order, error: orderFetchErr } = await admin
    .from("orders")
    .select("id,order_number,phone,customer_name")
    .eq("id", orderId)
    .maybeSingle();

  if (orderFetchErr || !order) {
    return { attempted: false, ok: false, skippedReason: "Sipariş bulunamadı" };
  }

  const phone = String(order.phone ?? "");
  const skip = getSkipReason(event, phone);
  if (skip) {
    const result: CustomerWhatsAppResult = { attempted: false, ok: false, skippedReason: skip };
    await logCustomerWhatsApp(admin, orderId, event, String(order.order_number ?? ""), result);
    return result;
  }

  const templateName = templateNameFor(event)!;
  const orderNumber = String(order.order_number ?? "").trim() || orderId;
  const tracking = opts?.trackingNumber ?? null;

  try {
    const bodyParam =
      event === "order_shipped"
        ? shipmentReference(orderNumber, tracking)
        : orderNumber;

    await sendWhatsAppTemplateMessage({
      to: phone,
      templateName,
      languageCode: getWhatsAppTemplateLanguage(),
      bodyParameters: [bodyParam],
      buttonParameters: [{ index: 0, text: orderButtonSuffix(orderId) }],
    });

    const result: CustomerWhatsAppResult = { attempted: true, ok: true };
    await logCustomerWhatsApp(admin, orderId, event, orderNumber, result);
    return result;
  } catch (err) {
    const result: CustomerWhatsAppResult = {
      attempted: true,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    await logCustomerWhatsApp(admin, orderId, event, orderNumber, result);
    console.warn("[notify] customer whatsapp failed", event, orderId, result.error);
    return result;
  }
}

/** Meta Business Manager’da oluşturulacak şablon metinleri (dokümantasyon). */
export const CUSTOMER_WHATSAPP_TEMPLATE_GUIDE = {
  order_paid: {
    env: TEMPLATE_ENV.order_paid,
    body: "Merhaba! {{1}} numaralı siparişini aldık. Ödemen onaylandı, siparişin hazırlanmaya başlıyor. Teşekkürler ❤️",
    button: "Siparişini gör → https://www.zeluladesign.com/siparis/{{1}}/basarili",
  },
  order_shipped: {
    env: TEMPLATE_ENV.order_shipped,
    body: "Gönderinle ilgili bir haberimiz var 📦 {{1}} numaralı gönderin kargoya verildi. Aldığın ürünü beğeneceğini umuyoruz ❤️",
    button: "Siparişini gör → https://www.zeluladesign.com/siparis/{{1}}/basarili",
  },
  order_delivered: {
    env: TEMPLATE_ENV.order_delivered,
    body: "Merhaba, {{1}} numaralı gönderini teslim ettik 📦 Güzel günlerde kullanman dileğiyle. Zelula'dan alışveriş yaptığın için teşekkürler ❤️",
    button: "Siparişini gör → https://www.zeluladesign.com/siparis/{{1}}/basarili",
  },
} as const;
