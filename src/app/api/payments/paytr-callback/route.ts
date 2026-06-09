import { NextResponse } from "next/server";
import { parsePaytrCallback } from "@/lib/payments/paytr";
import { applyPaymentResult } from "@/lib/payments/order-status";
import { logPayment } from "@/lib/payments/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PayTR Bildirim URL (sunucu→sunucu).
 * Hash doğrulanır, sipariş onaylanır. PayTR yeniden denemeyi durdurması için
 * gövde TAM olarak "OK" dönmelidir.
 */
export async function POST(req: Request) {
  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    logPayment("warn", "PayTR callback: gövde okunamadı.");
    return new NextResponse("FAIL", { status: 400 });
  }

  const parsed = parsePaytrCallback(fd);
  if (!parsed.ok) {
    logPayment("warn", "PayTR callback reddedildi.", { error: parsed.error });
    // Hash/alan hatasında OK dönme; gerçek bir doğrulama hatasıdır.
    return new NextResponse("FAIL", { status: 400 });
  }

  const result = await applyPaymentResult(parsed.payload);
  if (!result.ok) {
    // Geçici kilit/işlem hatası: OK dönme ki PayTR tekrar denesin.
    const reason = "reason" in result ? result.reason : "unknown";
    logPayment("error", "PayTR callback: sipariş işlenemedi.", {
      orderId: parsed.payload.orderId,
      reason,
    });
    return new NextResponse("FAIL", { status: 503 });
  }

  logPayment("info", "PayTR callback işlendi.", {
    orderId: parsed.payload.orderId,
    callbackStatus: parsed.payload.status,
    duplicate: "duplicate" in result ? result.duplicate : undefined,
  });
  return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}
