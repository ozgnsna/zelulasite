import { NextResponse } from "next/server";
import {
  getQnbReturnCallbackDiagnostics,
  parseQnbReturnForm,
} from "@/lib/payments/qnb-finansbank";
import { applyPaymentResult } from "@/lib/payments/order-status";
import { logPayment } from "@/lib/payments/logger";

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "") || "http://localhost:3000";
}

async function handleQnbReturn(fd: FormData) {
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
  let path: string;
  if (parsed.payload.status === "success") {
    path = `/odeme/basarili?oid=${oid}`;
  } else {
    const diag = getQnbReturnCallbackDiagnostics(fd);
    const q = new URLSearchParams({ oid: parsed.payload.orderId, msg: "generic" });
    if (diag.procReturnCode) q.set("code", diag.procReturnCode);
    if (diag.errMsg) q.set("bank", diag.errMsg.slice(0, 120));
    path = `/odeme/basarisiz?${q.toString()}`;
  }
  logPayment("info", "QNB return issuing HTTP redirect (tek uygulama kaynağı: /odeme/basarili veya basarisiz).", {
    orderId: parsed.payload.orderId,
    callbackStatus: parsed.payload.status,
    redirectPath: path,
    applyOk: result.ok,
    duplicate: "duplicate" in result ? result.duplicate : undefined,
  });
  return NextResponse.redirect(new URL(path, base), 303);
}

export async function POST(req: Request) {
  return handleQnbReturn(await req.formData());
}

/** Bazı banka akışları FailUrl’e GET ile döner. */
export async function GET(req: Request) {
  const fd = new FormData();
  const url = new URL(req.url);
  for (const [k, v] of url.searchParams.entries()) {
    fd.set(k, v);
  }
  return handleQnbReturn(fd);
}
