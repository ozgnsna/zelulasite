import { parsePaymentCallback } from "@/lib/payments/provider";
import { applyPaymentResult } from "@/lib/payments/order-status";
import { logPayment } from "@/lib/payments/logger";
import { createAdminClient } from "@/lib/supabase/admin";

function maybeUuid(value: string | undefined): string | null {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
}

export async function POST(req: Request) {
  const body = await req.formData();
  const parsed = await parsePaymentCallback(body);
  if (!parsed.ok || !parsed.payload) {
    const raw = Object.fromEntries(Array.from(body.entries()).map(([k, v]) => [k, String(v)]));
    logPayment("warn", "Callback rejected.", { error: parsed.error, errorCode: parsed.errorCode, raw });
    const admin = createAdminClient();
    await admin.from("payment_logs").insert({
      order_id: maybeUuid(raw.merchant_oid),
      provider: process.env.PAYMENT_PROVIDER ?? "paytr",
      event_type: "callback_rejected",
      status: "rejected",
      callback_payload: raw,
      callback_hash: raw.hash ?? null,
      reference: raw.payment_type ?? raw.failed_reason_code ?? null,
      verification_status: "failed",
      verification_error: parsed.error ?? "invalid callback",
      processed_at: new Date().toISOString(),
    });
    return new Response(parsed.error ?? "invalid callback", { status: 400 });
  }

  const result = await applyPaymentResult(parsed.payload);
  if (!result.ok) {
    logPayment("warn", "Callback apply failed.", result);
    return new Response("order not found", { status: 404 });
  }
  return new Response("OK", { status: 200 });
}
