import { randomBytes } from "node:crypto";
import { notFound } from "next/navigation";
import { Qnb3DPayForm } from "@/components/payments/Qnb3DPayForm";
import { QnbGatewayAutoPost } from "@/components/payments/QnbGatewayAutoPost";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildQnbCheckoutFormFields,
  getQnbFlowDebugMeta,
  getQnbPaymentConfig,
} from "@/lib/payments/qnb-finansbank";
import {
  serializeQnbHiddenFieldsJson,
  validateGatewayUrlMatchesSecureType,
  validateQnb3DPayHiddenFields,
  validateQnbGatewayPostUrl,
} from "@/lib/payments/qnb-3dpay-guards";
import { isPaymentFlowDebugEnabled, logPayment } from "@/lib/payments/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isNextNotFound(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  return "digest" in e && (e as { digest?: unknown }).digest === "NEXT_NOT_FOUND";
}

function PrepError({
  title,
  detail,
  incidentId,
  showTechnical,
}: {
  title: string;
  detail: string;
  incidentId: string;
  showTechnical: boolean;
}) {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="font-medium text-stone-900">{title}</p>
      <p className="mt-2 text-sm text-stone-600">{detail}</p>
      <p className="mt-6 font-mono text-xs text-stone-500">Kod: {incidentId}</p>
      {showTechnical ? (
        <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
          Vercel function loglarında aynı kodla arayın. `QNB_PAY_FLOW_DEBUG=1` iken ek ayrıntılar yazılır.
        </p>
      ) : null}
    </main>
  );
}

export default async function QnbPaymentStartPage({ params }: { params: Promise<{ orderId: string }> }) {
  const incidentId = `PF-${randomBytes(5).toString("hex")}`;
  const flowDebug = isPaymentFlowDebugEnabled();
  const allowHttpGateway = process.env.NODE_ENV === "development";

  try {
    const { orderId } = await params;
    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("id,total,payment_status,payment_provider,customer_name,email,phone")
      .eq("id", orderId)
      .maybeSingle();

    if (
      !order ||
      String(order.payment_status ?? "") !== "pending" ||
      String(order.payment_provider ?? "") !== "qnb_finansbank"
    ) {
      notFound();
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
    if (!siteUrl) {
      logPayment("error", "qnb-baslat: NEXT_PUBLIC_SITE_URL eksik.", { incidentId, ...getQnbPaymentConfig() });
      return (
        <PrepError
          title="Sunucu yapılandırması eksik"
          detail="NEXT_PUBLIC_SITE_URL tanımlı değil. Ödeme dönüşü için bu değer gereklidir."
          incidentId={incidentId}
          showTechnical={flowDebug}
        />
      );
    }

    const okUrl = `${siteUrl}/api/payments/qnb-return`;
    const failUrl = okUrl;
    const purchAmount = Number(order.total ?? 0).toFixed(2);
    const built = buildQnbCheckoutFormFields({
      orderId: String(order.id),
      purchAmount,
      okUrl,
      failUrl,
      customerName: String(order.customer_name ?? ""),
      customerEmail: String(order.email ?? ""),
      customerPhone: String(order.phone ?? ""),
    });

    if ("error" in built) {
      logPayment("error", "qnb-baslat: form alanları üretilemedi.", {
        incidentId,
        error: built.error,
        ...getQnbFlowDebugMeta(),
        ...getQnbPaymentConfig(),
      });
      return (
        <PrepError
          title="Ödeme başlatılamadı"
          detail={built.error}
          incidentId={incidentId}
          showTechnical={flowDebug}
        />
      );
    }

    const hasCustomGateway = Boolean(process.env.QNB_GATEWAY_URL?.trim());

    if (flowDebug) {
      logPayment("info", "qnb-baslat: ödeme ekranı seçimi.", {
        orderId,
        incidentId,
        ...getQnbFlowDebugMeta(),
        ...getQnbPaymentConfig(),
        uiBranch: built.secureType === "3DPay" ? "Qnb3DPayForm" : "QnbGatewayAutoPost",
        gatewayUrl: built.gatewayUrl,
      });
    }

    if (built.secureType === "3DPay") {
      const urlVal = validateQnbGatewayPostUrl(built.gatewayUrl, { allowHttp: allowHttpGateway });
      if (!urlVal.ok) {
        logPayment("error", "qnb-baslat: gateway URL geçersiz (3DPay).", {
          incidentId,
          reason: urlVal.reason,
          gatewayUrl: built.gatewayUrl,
          ...getQnbPaymentConfig(),
        });
        return (
          <PrepError
            title="Ödeme formu hazırlanamadı"
            detail={
              flowDebug
                ? `Geçersiz banka adresi (${urlVal.reason}). Gateway URL’sini ve QNB_TEST_MODE değerini kontrol edin.`
                : "Ödeme sayfası hazırlanırken bir sorun oluştu. Lütfen tekrar deneyin."
            }
            incidentId={incidentId}
            showTechnical={flowDebug}
          />
        );
      }

      const typeOk = validateGatewayUrlMatchesSecureType(urlVal.url, "3DPay", hasCustomGateway);
      if (!typeOk.ok) {
        logPayment("error", "qnb-baslat: gateway / SecureType uyumsuz (3DPay).", {
          incidentId,
          reason: typeOk.reason,
          ...getQnbPaymentConfig(),
        });
        return (
          <PrepError
            title="Ödeme formu hazırlanamadı"
            detail={typeOk.reason}
            incidentId={incidentId}
            showTechnical={flowDebug}
          />
        );
      }

      const hfOk = validateQnb3DPayHiddenFields(built.hiddenFields);
      if (!hfOk.ok) {
        logPayment("error", "qnb-baslat: imzalı alanlar eksik (3DPay).", {
          incidentId,
          missingKeys: hfOk.missingKeys,
          ...getQnbPaymentConfig(),
        });
        return (
          <PrepError
            title="Ödeme formu hazırlanamadı"
            detail={
              flowDebug
                ? `Eksik alanlar: ${hfOk.missingKeys.join(", ")}`
                : "Ödeme imzası oluşturulamadı. Yapılandırmayı kontrol edin."
            }
            incidentId={incidentId}
            showTechnical={flowDebug}
          />
        );
      }

      const ser = serializeQnbHiddenFieldsJson(built.hiddenFields);
      if (!ser.ok) {
        logPayment("error", "qnb-baslat: imzalı alanlar serileştirilemedi.", {
          incidentId,
          error: ser.error,
          ...getQnbPaymentConfig(),
        });
        return (
          <PrepError
            title="Ödeme formu hazırlanamadı"
            detail={flowDebug ? ser.error : "Lütfen tekrar deneyin."}
            incidentId={incidentId}
            showTechnical={flowDebug}
          />
        );
      }

      return (
        <main className="min-h-[50vh] bg-[#f9f6f2]">
          <Qnb3DPayForm
            postUrl={urlVal.url}
            hiddenFieldsJson={ser.json}
            flowDebug={flowDebug}
            incidentId={incidentId}
          />
        </main>
      );
    }

    const urlVal = validateQnbGatewayPostUrl(built.gatewayUrl, { allowHttp: allowHttpGateway });
    if (!urlVal.ok) {
      logPayment("error", "qnb-baslat: gateway URL geçersiz (3DHost).", {
        incidentId,
        reason: urlVal.reason,
        ...getQnbPaymentConfig(),
      });
      return (
        <PrepError
          title="Ödeme yönlendirmesi hazırlanamadı"
          detail={flowDebug ? `Geçersiz banka adresi (${urlVal.reason}).` : "Lütfen tekrar deneyin."}
          incidentId={incidentId}
          showTechnical={flowDebug}
        />
      );
    }

    const hostTypeOk = validateGatewayUrlMatchesSecureType(urlVal.url, "3DHost", hasCustomGateway);
    if (!hostTypeOk.ok) {
      logPayment("error", "qnb-baslat: gateway / SecureType uyumsuz (3DHost).", {
        incidentId,
        reason: hostTypeOk.reason,
        ...getQnbPaymentConfig(),
      });
      return (
        <PrepError
          title="Ödeme yönlendirmesi hazırlanamadı"
          detail={hostTypeOk.reason}
          incidentId={incidentId}
          showTechnical={flowDebug}
        />
      );
    }

    return (
      <main className="min-h-[40vh]">
        <QnbGatewayAutoPost postUrl={urlVal.url} fields={built.fields} flowDebug={flowDebug} />
      </main>
    );
  } catch (e) {
    if (isNextNotFound(e)) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    logPayment("error", "qnb-baslat: beklenmeyen hata.", {
      incidentId,
      message: msg,
      ...getQnbFlowDebugMeta(),
      ...getQnbPaymentConfig(),
    });
    return (
      <PrepError
        title="Ödeme adımı yüklenemedi"
        detail={flowDebug ? msg : "Geçici bir hata oluştu. Lütfen bir süre sonra tekrar deneyin."}
        incidentId={incidentId}
        showTechnical={flowDebug}
      />
    );
  }
}
