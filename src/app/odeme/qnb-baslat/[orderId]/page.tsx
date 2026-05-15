import { randomBytes } from "node:crypto";
import { notFound } from "next/navigation";
import { BankReviewDemoCardPage } from "@/components/payments/BankReviewDemoCardPage";
import { Qnb3DPayForm } from "@/components/payments/Qnb3DPayForm";
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
import { qnbInitiateApiPath } from "@/lib/payments/qnb-initiate";
import { isPaymentFlowDebugEnabled, isQnbCustomerFacingDebugVisible, logPayment } from "@/lib/payments/logger";

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

/** Yalnızca geliştirme / önizleme — canlıda müşteriye gösterilmez. */
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
          <span className="font-medium text-stone-800">Sunucu POST hedefi:</span> {meta.gatewayUrlResolved}
        </li>
        <li>
          <span className="font-medium text-stone-800">Müşteri formu:</span> {qnbInitiateApiPath()} (sunucu üzerinden)
        </li>
      </ul>
    </div>
  );
}

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
        QNB yapılandırma özeti: tanımlı zorunlu anahtarlar tam (değerler gösterilmez).
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
  const showCustomerDebug = isQnbCustomerFacingDebugVisible();

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
    const built = buildQnbCheckoutFormFields({
      orderId: String(order.id),
      purchAmount: Number(order.total ?? 0).toFixed(2),
      okUrl,
      failUrl: okUrl,
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

    const gatewayRoutingDebug = showCustomerDebug ? getQnbGatewayRoutingDebug(built.secureType) : null;

    if (flowDebug) {
      logPayment("info", "qnb-baslat: ödeme ekranı seçimi.", {
        orderId,
        incidentId,
        ...getQnbFlowDebugMeta(),
        ...getQnbPaymentConfig(),
        uiBranch: built.secureType === "3DPay" ? "Qnb3DPayForm" : "unsupported",
        gatewayUrl: built.gatewayUrl,
        initiatePath: qnbInitiateApiPath(),
        missingEnvNamesOnly: qnbPayFlowDiagMissing,
        liveConfigHintEnvNamesOnly: qnbPayFlowDiagHints,
      });
    }

    if (built.secureType === "3DPay") {
      return (
        <main className="min-h-[50vh] bg-[#f9f6f2]">
          {showCustomerDebug ? (
            <div className="space-y-2 px-4 pt-4">
              <QnbGatewayRoutingDebugPanel flowDebug={showCustomerDebug} meta={gatewayRoutingDebug} />
              <QnbPayFlowEnvDiagnostics
                flowDebug={showCustomerDebug}
                missing={qnbPayFlowDiagMissing}
                hints={qnbPayFlowDiagHints}
              />
            </div>
          ) : null}
          <Qnb3DPayForm orderId={String(order.id)} initiatePath={qnbInitiateApiPath()} incidentId={incidentId} />
        </main>
      );
    }

    return (
      <PrepError
        title="Ödeme yöntemi yapılandırılmamış"
        detail="Canlı ödeme için QNB_SECURE_TYPE=3DPay kullanın. 3DHost şu an devre dışıdır."
        incidentId={incidentId}
        showTechnical={flowDebug}
      />
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
