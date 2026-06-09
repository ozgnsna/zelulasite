import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PaytrIframe } from "@/components/payments/PaytrIframe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPaytrIframeToken, paytrTestMode } from "@/lib/payments/paytr";
import { logPayment } from "@/lib/payments/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isNextNotFound(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  return "digest" in e && (e as { digest?: unknown }).digest === "NEXT_NOT_FOUND";
}

function PrepError({ title, detail, incidentId }: { title: string; detail: string; incidentId: string }) {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="font-medium text-stone-900">{title}</p>
      <p className="mt-2 text-sm text-stone-600">{detail}</p>
      <p className="mt-6 font-mono text-xs text-stone-500">Kod: {incidentId}</p>
    </main>
  );
}

function clientIpFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    h.get("x-real-ip")?.trim() ||
    h.get("cf-connecting-ip")?.trim() ||
    h.get("x-vercel-forwarded-for")?.trim() ||
    "127.0.0.1"
  );
}

export default async function PaytrPaymentStartPage({ params }: { params: Promise<{ orderId: string }> }) {
  const incidentId = `PF-${randomBytes(5).toString("hex")}`;

  try {
    const { orderId } = await params;
    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select(
        "id,order_number,total,currency,payment_status,payment_provider,customer_name,email,phone,shipping_address_json",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (
      !order ||
      String(order.payment_status ?? "") !== "pending" ||
      String(order.payment_provider ?? "") !== "paytr"
    ) {
      notFound();
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
    if (!siteUrl) {
      logPayment("error", "paytr-baslat: NEXT_PUBLIC_SITE_URL eksik.", { incidentId });
      return (
        <PrepError
          title="Sunucu yapılandırması eksik"
          detail="NEXT_PUBLIC_SITE_URL tanımlı değil. Ödeme dönüşü için bu değer gereklidir."
          incidentId={incidentId}
        />
      );
    }

    const addr = (order.shipping_address_json ?? {}) as Record<string, unknown>;
    const userAddress = [addr.address_line, addr.district, addr.city, addr.postal_code]
      .filter(Boolean)
      .join(" ")
      .slice(0, 400);

    const reqHeaders = await headers();
    const userIp = clientIpFromHeaders(reqHeaders);

    const okUrl = `${siteUrl}/odeme/basarili?oid=${encodeURIComponent(String(order.id))}`;
    const failUrl = `${siteUrl}/odeme/basarisiz?oid=${encodeURIComponent(String(order.id))}`;

    const tokenResult = await createPaytrIframeToken({
      orderId: String(order.id),
      amount: Number(order.total ?? 0),
      email: String(order.email ?? ""),
      userName: String(order.customer_name ?? ""),
      userPhone: String(order.phone ?? ""),
      userAddress,
      userIp,
      okUrl,
      failUrl,
    });

    if (!tokenResult.ok) {
      logPayment("error", "paytr-baslat: token alınamadı.", {
        incidentId,
        orderId: String(order.id),
        error: tokenResult.error,
        testMode: paytrTestMode(),
      });
      return (
        <PrepError
          title="Ödeme başlatılamadı"
          detail="Ödeme sayfası hazırlanamadı. Lütfen tekrar deneyin veya destek ile iletişime geçin."
          incidentId={incidentId}
        />
      );
    }

    logPayment("info", "paytr-baslat: iframe token alındı.", {
      orderId: String(order.id),
      orderNumber: String(order.order_number ?? ""),
      testMode: paytrTestMode(),
    });

    return (
      <main className="min-h-[60vh] bg-[#f9f6f2]">
        <div className="mx-auto max-w-xl px-4 py-6">
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <PaytrIframe iframeUrl={tokenResult.iframeUrl} />
          </div>
        </div>
      </main>
    );
  } catch (e) {
    if (isNextNotFound(e)) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    logPayment("error", "paytr-baslat: beklenmeyen hata.", { incidentId, message: msg });
    return (
      <PrepError
        title="Ödeme adımı yüklenemedi"
        detail="Geçici bir hata oluştu. Lütfen bir süre sonra tekrar deneyin."
        incidentId={incidentId}
      />
    );
  }
}
