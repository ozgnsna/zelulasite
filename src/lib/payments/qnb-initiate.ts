import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildQnbCheckoutFormFields,
  buildQnb3DPayPostBody,
  getQnb3DPayPayloadAudit,
  getQnbCredentials,
  getQnbGatewayUrl,
  getQnbSecureType,
  isQnbVposMerchantLoginResponse,
} from "@/lib/payments/qnb-finansbank";
import { isPaymentFlowDebugEnabled, logPayment } from "@/lib/payments/logger";
import { validateQnb3DPayHiddenFields, validateQnbGatewayPostUrl } from "@/lib/payments/qnb-3dpay-guards";

const QNB_INITIATE_PATH = "/api/payments/qnb-initiate";

/** POST alan adları — değerler loglanmaz. */
const SENSITIVE_FIELD_NAMES = new Set([
  "Pan",
  "Cvv2",
  "Expiry",
  "UserPass",
  "Hash",
  "MerchantPass",
]);

export type QnbInitiateCardInput = {
  pan: string;
  expiry: string;
  cvv2: string;
};

export type QnbInitiateResult =
  | { ok: true; html: string; status: number; contentType: string }
  | { ok: false; status: number; error: string; errorCode: string };

function siteUrlBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
}

function parseCardFromFormData(fd: FormData): QnbInitiateCardInput | { error: string } {
  const pan = String(fd.get("Pan") ?? "")
    .replace(/\D/g, "")
    .slice(0, 19);
  const expiry = String(fd.get("Expiry") ?? "")
    .replace(/\D/g, "")
    .slice(0, 4);
  const cvv2 = String(fd.get("Cvv2") ?? "")
    .replace(/\D/g, "")
    .slice(0, 4);

  if (pan.length < 12 || pan.length > 19) {
    return { error: "Geçersiz kart numarası." };
  }
  if (expiry.length !== 4) {
    return { error: "Son kullanma tarihi MMYY formatında olmalıdır (QNB: ay + yıl)." };
  }
  if (cvv2.length < 3 || cvv2.length > 4) {
    return { error: "Geçersiz güvenlik kodu." };
  }
  return { pan, expiry, cvv2 };
}

function safeFieldNamesForLog(fields: Record<string, string>): string[] {
  return Object.keys(fields)
    .filter((k) => !SENSITIVE_FIELD_NAMES.has(k))
    .sort();
}

/**
 * QNB 3DPay: imzalı alanlar + kart verisi sunucudan bankaya POST edilir; HTML yanıt müşteriye döner.
 * Kart verisi saklanmaz / loglanmaz.
 */
export async function initiateQnb3DPayFromFormData(fd: FormData): Promise<QnbInitiateResult> {
  const orderId = String(fd.get("orderId") ?? "").trim();
  if (!orderId) {
    return { ok: false, status: 400, error: "Sipariş kimliği eksik.", errorCode: "ORDER_ID_MISSING" };
  }

  const cardParsed = parseCardFromFormData(fd);
  if ("error" in cardParsed) {
    return { ok: false, status: 400, error: cardParsed.error, errorCode: "CARD_INVALID" };
  }

  const siteUrl = siteUrlBase();
  if (!siteUrl) {
    return {
      ok: false,
      status: 500,
      error: "Ödeme yapılandırması eksik.",
      errorCode: "SITE_URL_MISSING",
    };
  }

  const cred = getQnbCredentials();
  if (!cred.ok) {
    return {
      ok: false,
      status: 500,
      error: "Ödeme yapılandırması eksik.",
      errorCode: "CONFIG_MISSING",
    };
  }

  const secureType = getQnbSecureType();
  if (secureType !== "3DPay") {
    return {
      ok: false,
      status: 400,
      error: "Bu ödeme yöntemi yalnızca 3DPay ile kullanılabilir. QNB_SECURE_TYPE=3DPay olmalıdır.",
      errorCode: "SECURE_TYPE_NOT_3DPAY",
    };
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id,total,currency,payment_status,payment_provider,customer_name,email,phone")
    .eq("id", orderId)
    .maybeSingle();

  if (
    !order ||
    String(order.payment_status ?? "") !== "pending" ||
    String(order.payment_provider ?? "") !== "qnb_finansbank"
  ) {
    return {
      ok: false,
      status: 404,
      error: "Sipariş bulunamadı veya ödeme için uygun değil.",
      errorCode: "ORDER_NOT_PAYABLE",
    };
  }

  const purchAmount = Number(order.total ?? 0).toFixed(2);
  if (!purchAmount || Number(purchAmount) <= 0) {
    return { ok: false, status: 400, error: "Geçersiz sipariş tutarı.", errorCode: "AMOUNT_INVALID" };
  }

  const okUrl = `${siteUrl}/api/payments/qnb-return`;
  const built = buildQnbCheckoutFormFields({
    orderId: String(order.id),
    purchAmount,
    okUrl,
    failUrl: okUrl,
    customerName: String(order.customer_name ?? ""),
    customerEmail: String(order.email ?? ""),
    customerPhone: String(order.phone ?? ""),
  });

  if ("error" in built || built.secureType !== "3DPay") {
    return {
      ok: false,
      status: 500,
      error: "error" in built ? built.error : "Ödeme formu oluşturulamadı.",
      errorCode: "BUILD_FAILED",
    };
  }

  const gatewayUrl = built.gatewayUrl;
  const allowHttp = process.env.NODE_ENV === "development";
  const urlVal = validateQnbGatewayPostUrl(gatewayUrl, { allowHttp });
  if (!urlVal.ok) {
    return {
      ok: false,
      status: 500,
      error: "Banka adresi geçersiz.",
      errorCode: "GATEWAY_URL_INVALID",
    };
  }

  const postFields: Record<string, string> = {
    ...built.hiddenFields,
    Pan: cardParsed.pan,
    Expiry: cardParsed.expiry,
    Cvv2: cardParsed.cvv2,
  };

  const hfOk = validateQnb3DPayHiddenFields(built.hiddenFields);
  if (!hfOk.ok) {
    return {
      ok: false,
      status: 500,
      error: "Ödeme imzası oluşturulamadı.",
      errorCode: "SIGNATURE_FIELDS_MISSING",
    };
  }

  const bodyString = buildQnb3DPayPostBody(postFields);

  if (isPaymentFlowDebugEnabled()) {
    const audit = getQnb3DPayPayloadAudit(postFields, {
      mbrId: cred.mbrId,
      merchantPass: cred.merchantPass,
    });
    logPayment("info", "qnb-initiate: 3DPay POST özeti (QNB Help uyum teşhisi, sırlar yok).", {
      orderId,
      gatewayUrl: urlVal.url,
      initiateStatus: "posting",
      outgoingFieldNamesOnly: safeFieldNamesForLog(postFields),
      outgoingFieldCount: audit.outgoingFieldCount,
      secureTypeSelected: audit.secureTypeSelected,
      txnType: audit.txnType,
      installmentCount: audit.installmentCount,
      currency: audit.currency,
      purchAmountFormatted: audit.hashAudit.purchAmountFormatted,
      purchAmountFractionDigits: audit.hashAudit.purchAmountFractionDigits,
      purchAmountDecimalSeparator: audit.hashAudit.purchAmountDecimalSeparator,
      hashFieldOrder: audit.hashAudit.hashFieldOrder,
      hashConcatLengthExcludingMerchantPass: audit.hashAudit.hashConcatLengthExcludingMerchantPass,
      hashConcatLengthIncludingMerchantPass: audit.hashAudit.hashConcatLengthIncludingMerchantPass,
      merchantPassLength: audit.hashAudit.merchantPassLength,
      currencyInHash: audit.hashAudit.currencyInHash,
      hashEncoding: audit.hashAudit.encoding,
      orderIdLength: audit.hashAudit.orderIdLength,
      orderIdHasHyphens: audit.hashAudit.orderIdHasHyphens,
      merchantPassFieldInPost: audit.merchantPassFieldInPost,
      helpDocFieldNamesMissingFromPost: audit.helpDocFieldNamesMissingFromPost,
      extraFieldNamesBeyondHelpDoc: audit.extraFieldNamesBeyondHelpDoc,
      hashGenerated: audit.hashGenerated,
    });
  }

  let qnbResponse: Response;
  try {
    qnbResponse = await fetch(urlVal.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      body: bodyString,
      redirect: "follow",
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch_failed";
    logPayment("error", "qnb-initiate: banka POST başarısız.", {
      orderId,
      gatewayUrl: urlVal.url,
      initiateStatus: "fetch_error",
      message: msg,
    });
    return {
      ok: false,
      status: 502,
      error: "Banka ile bağlantı kurulamadı. Lütfen tekrar deneyin.",
      errorCode: "GATEWAY_UNREACHABLE",
    };
  }

  const html = await qnbResponse.text();
  const contentType = qnbResponse.headers.get("content-type") ?? "text/html; charset=utf-8";
  const responseUrl = qnbResponse.url;
  const looksLikeVposLogin = isQnbVposMerchantLoginResponse(html, responseUrl);

  if (isPaymentFlowDebugEnabled()) {
    logPayment("info", "qnb-initiate: banka yanıtı alındı (kart/sır loglanmaz).", {
      orderId,
      gatewayUrl: urlVal.url,
      initiateStatus: looksLikeVposLogin ? "vpos_login_html" : "completed",
      qnbResponseStatus: qnbResponse.status,
      responseUrl,
      responseLooksLikeVposLogin: looksLikeVposLogin,
      outgoingFieldNamesOnly: safeFieldNamesForLog(postFields),
      outgoingFieldCount: Object.keys(postFields).length,
      responseContentType: contentType.split(";")[0]?.trim() ?? null,
      responseBodyLength: html.length,
    });
  }

  if (looksLikeVposLogin) {
    logPayment("error", "qnb-initiate: banka VPOS giriş sayfası döndü (3DS değil).", {
      orderId,
      gatewayUrl: urlVal.url,
      responseUrl,
      merchantPassInPost: Boolean(postFields.MerchantPass),
    });
    return {
      ok: false,
      status: 502,
      error:
        "Banka ödeme ekranı yerine üye işyeri giriş sayfası döndü. QNB_USER_CODE, QNB_USER_PASS ve QNB_MERCHANT_PASS (3D şifre) değerlerini ve canlı/test ortam eşleşmesini kontrol edin.",
      errorCode: "GATEWAY_VPOS_LOGIN_PAGE",
    };
  }

  if (!qnbResponse.ok && qnbResponse.status >= 400 && html.length < 64) {
    return {
      ok: false,
      status: 502,
      error: "Banka ödeme isteğini reddetti. Lütfen tekrar deneyin.",
      errorCode: "GATEWAY_HTTP_ERROR",
    };
  }

  return {
    ok: true,
    html,
    status: qnbResponse.status >= 200 && qnbResponse.status < 600 ? qnbResponse.status : 200,
    contentType,
  };
}

export function qnbInitiateApiPath(): string {
  return QNB_INITIATE_PATH;
}

/** Sunucu tarafı teşhis logları için; müşteriye gösterilmez. */
export function getQnbInitiateGatewayUrlForDebug(): string {
  return getQnbGatewayUrl("3DPay");
}
