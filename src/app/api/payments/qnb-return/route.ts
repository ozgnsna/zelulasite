import { NextResponse } from "next/server";
import { parseQnbReturnForm } from "@/lib/payments/qnb-finansbank";
import { applyPaymentResult } from "@/lib/payments/order-status";
import { logPayment } from "@/lib/payments/logger";

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "") || "http://localhost:3000";
}

export async function POST(req: Request) {
  const fd = await req.formData();
  const parsed = await parseQnbReturnForm(fd);
  if (!parsed.ok || !parsed.payload) {
    logPayment("warn", "QNB return rejected.", { error: parsed.error, errorCode: parsed.errorCode });
    return new NextResponse(parsed.error ?? "invalid", { status: 400 });
  }

  const result = await applyPaymentResult(parsed.payload);
  if (!result.ok) {
    return new NextResponse("order not found", { status: 404 });
  }

  const base = siteBase();
  const oid = encodeURIComponent(parsed.payload.orderId);
  const path =
    parsed.payload.status === "success"
      ? `/odeme/basarili?oid=${oid}`
      : `/odeme/basarisiz?oid=${oid}&msg=generic`;
  logPayment("info", "QNB return issuing HTTP redirect (tek uygulama kaynağı: /odeme/basarili veya basarisiz).", {
    orderId: parsed.payload.orderId,
    callbackStatus: parsed.payload.status,
    redirectPath: path,
    applyOk: result.ok,
    duplicate: "duplicate" in result ? result.duplicate : undefined,
  });
  return NextResponse.redirect(new URL(path, base), 303);
}
