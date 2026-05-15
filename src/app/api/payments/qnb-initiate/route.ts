import { NextResponse } from "next/server";
import { initiateQnb3DPayFromFormData } from "@/lib/payments/qnb-initiate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * QNB 3DPay: müşteri kart formu buraya POST eder; sunucu bankaya POST eder ve dönen HTML'i iletir.
 * Kart verisi saklanmaz / loglanmaz.
 */
export async function POST(req: Request) {
  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return new NextResponse("Geçersiz istek.", { status: 400 });
  }

  const result = await initiateQnb3DPayFromFormData(fd);

  if (!result.ok) {
    const body = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/><title>Ödeme</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;text-align:center"><p>${escapeHtml(result.error)}</p><p><a href="javascript:history.back()">Geri dön</a></p></body></html>`;
    return new NextResponse(body, {
      status: result.status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(result.html, {
    status: result.status,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
