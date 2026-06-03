import { NextResponse } from "next/server";
import { initiateQnb3DPayFromFormData } from "@/lib/payments/qnb-initiate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * QNB 3DPay: müşteri kart formu buraya POST eder; sunucu bankaya POST eder ve dönen HTML'i iletir.
 * Kart verisi saklanmaz / loglanmaz.
 */
/**
 * Müşterinin gerçek IP'si. Öncelik sırası:
 *  1) X-Forwarded-For (ilk = orijinal istemci)
 *  2) X-Real-IP
 *  3) Bağlantı uç adresi karşılığı edge/proxy header'ları (Vercel/Cloudflare).
 *
 * Not: Next.js route handler'ı Web `Request` alır; ham TCP soketi (req.socket.remoteAddress)
 * bu çalışma ortamında erişilebilir değildir. Vercel'de gerçek istemci IP'si zaten
 * X-Forwarded-For / X-Vercel-Forwarded-For içinde taşınır.
 */
function clientIpFromRequest(req: Request): string | null {
  const h = req.headers;

  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const real = h.get("x-real-ip")?.trim();
  if (real) return real;

  // Bağlantı uç adresi karşılığı: edge/proxy'nin gördüğü istemci IP'si.
  for (const name of ["x-vercel-forwarded-for", "cf-connecting-ip", "true-client-ip"]) {
    const v = h.get(name);
    const first = v?.split(",")[0]?.trim();
    if (first) return first;
  }

  // RFC 7239 Forwarded: for=1.2.3.4 (IPv6 köşeli parantez içinde gelebilir)
  const fwd = h.get("forwarded");
  if (fwd) {
    const m = fwd.match(/for=("?\[?)([^;,"\]]+)/i);
    const ip = m?.[2]?.trim();
    if (ip) return ip;
  }

  return null;
}

export async function POST(req: Request) {
  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return new NextResponse("Geçersiz istek.", { status: 400 });
  }

  const clientIp = clientIpFromRequest(req);
  const result = await initiateQnb3DPayFromFormData(fd, { clientIp });

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
