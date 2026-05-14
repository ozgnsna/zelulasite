import { randomBytes } from "node:crypto";
import { notFound } from "next/navigation";
import { BankReviewDemoCardPage } from "@/components/payments/BankReviewDemoCardPage";
import { Qnb3DPayForm } from "@/components/payments/Qnb3DPayForm";
import { QnbGatewayAutoPost } from "@/components/payments/QnbGatewayAutoPost";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildQnbCheckoutFormFields,
  getMissingQnbCredentialEnvNames,
  getMissingQnbEnvNamesForDiagnostics,
  getQnbCredentials,
  getQnbFlowDebugMeta,
  getQnbGatewayRoutingDebug,
  getQnbLiveConfigurationEnvHintNames,
  getQnbPaymentConfig,
  isBankReviewMode,
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

/** Yalnızca `QNB_PAY_FLOW_DEBUG=1` (veya dev) iken; URL / mod bilgisi, sır yok. */
function QnbGatewayRoutingDebugPanel({
  flowDebug,
  meta,
}: {
  flowDebug: boolean;
  meta: ReturnType<typeof getQnbGatewayRoutingDebug> | null;
}) {
  if (!flowDebug || !meta) return null;
  return (
    <div
      className="mx-auto max-w-md rounded-lg border border-amber-200/70 bg-amber-50/50 px-3 py-2.5 text-[11px] text-stone-800"
      role="status"
    >
      <p className="font-semibold text-stone-900">QNB ödeme yönlendirmesi (teşhis)</p>
      <ul className="mt-1.5 space-y-1 font-mono text-[10px] leading-snug text-stone-700 break-all">
        <li>
          <span className="font-medium text-stone-800">secureType:</span> {meta.secureType}
        </li>
        <li>
          <span className="font-medium text-stone-800">QNB_TEST_MODE (ham):</span> {meta.qnbTestModeRaw ?? "(tanımsız)"}
        </li>
        <li>
          <span className="font-medium text-stone-800">Canlı vPOS kökü (TEST_MODE=0):</span>{" "}
          {meta.qnbTestModeLiveHost ? "evet" : "hayır"}
        </li>
        <li>
          <span className="font-medium text-stone-800">QNB_GATEWAY_URL override:</span>{" "}
          {meta.qnbGatewayUrlOverrideSet ? "evet" : "hayır"}
        </li>
        <li>
          <span className="font-medium text-stone-800">Çözülen form action (POST):</span> {meta.gatewayUrlResolved}
        </li>
      </ul>
    </div>
  );
}

/** Yalnızca isimler; değer yok. `QNB_PAY_FLOW_DEBUG` veya geliştirme ortamında gösterilir. */
function QnbPayFlowEnvDiagnostics({
  flowDebug,
  missing,
  hints,
}: {
  flowDebug: boolean;
  missing: string[];
  hints: string[];
}) {
  if (!flowDebug) return null;
  if (missing.length === 0 && hints.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 pt-4 text-[11px] leading-relaxed text-stone-500" role="status">
        QNB yapılandırma özeti: tanımlı zorunlu anahtarlar tam (değerler gösterilmez).{" "}
        <span className="text-stone-400">Yalnızca ödeme akışı teşhisi açıkken görünür.</span>
      </div>
    );
  }
  return (
    <div
      className="mx-auto max-w-md border-b border-stone-200/60 px-4 pb-3 pt-4 text-[11px] leading-relaxed text-stone-600"
      role="status"
    >
      {missing.length > 0 ? (
        <p>
          <span className="font-medium text-stone-800">Eksik ortam değişkeni:</span> {missing.join(", ")}
        </p>
      ) : null}
      {hints.length > 0 ? (
        <p className={missing.length > 0 ? "mt-1.5" : ""}>
          <span className="font-medium text-stone-800">Canlı için gözden geçirin:</span> {hints.join(", ")}
        </p>
      ) : null}
    </div>
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
      .select("id,order_number,total,currency,payment_status,payment_provider,customer_name,email,phone")
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
    const qnbPayFlowDiagMissing = getMissingQnbEnvNamesForDiagnostics();
    const qnbPayFlowDiagHints = getQnbLiveConfigurationEnvHintNames();
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

    const cred = getQnbCredentials();
    if (isBankReviewMode() && !cred.ok) {
      logPayment("info", "qnb-baslat: bank review demo (QNB env eksik, gerçek ödeme yok).", {
        orderId: String(order.id),
        bankReviewMode: true,
      });
      const showCheckoutDebug = process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1";
      return (
        <main className="min-h-[50vh] bg-[#f9f6f2]">
          <BankReviewDemoCardPage
            orderId={String(order.id)}
            orderNumber={String(order.order_number ?? "")}
            orderTotal={Number(order.total ?? 0)}
            currency={String(order.currency ?? "TRY")}
            customerName={String(order.customer_name ?? "")}
            customerEmail={String(order.email ?? "")}
            showDebugBadge={showCheckoutDebug}
            missingQnbKeys={getMissingQnbCredentialEnvNames()}
          />
        </main>
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

    const gatewayRoutingDebug = flowDebug ? getQnbGatewayRoutingDebug(built.secureType) : null;

    if (flowDebug) {
      logPayment("info", "qnb-baslat: ödeme ekranı seçimi.", {
        orderId,
        incidentId,
        ...getQnbFlowDebugMeta(),
        ...getQnbPaymentConfig(),
        uiBranch: built.secureType === "3DPay" ? "Qnb3DPayForm" : "QnbGatewayAutoPost",
        gatewayUrl: built.gatewayUrl,
        missingEnvNamesOnly: qnbPayFlowDiagMissing,
        liveConfigHintEnvNamesOnly: qnbPayFlowDiagHints,
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
          <div className="space-y-2 px-4 pt-4">
            <QnbGatewayRoutingDebugPanel flowDebug={flowDebug} meta={gatewayRoutingDebug} />
            <QnbPayFlowEnvDiagnostics
              flowDebug={flowDebug}
              missing={qnbPayFlowDiagMissing}
              hints={qnbPayFlowDiagHints}
            />
          </div>
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
        <div className="space-y-2 px-4 pt-4">
          <QnbGatewayRoutingDebugPanel flowDebug={flowDebug} meta={gatewayRoutingDebug} />
          <QnbPayFlowEnvDiagnostics
            flowDebug={flowDebug}
            missing={qnbPayFlowDiagMissing}
            hints={qnbPayFlowDiagHints}
          />
        </div>
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
