import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type {
  PaymentCallbackPayload,
  PaymentCallbackResult,
  PaymentInitPayload,
  PaymentInitResult,
} from "@/lib/payments/types";
import { isPaymentFlowDebugEnabled, logPayment } from "@/lib/payments/logger";

/**
 * QNB Finansbank vPOS
 * - **3DPay** (`Gateway/Default.aspx`): Kart üye işyeri sayfasında girilir, form bankaya POST edilir (çoğu sözleşme).
 * - **3DHost** (`Gateway/3DHost.aspx`): Kart tamamen bankanın sayfasında; hash aynı mantık, `SecureType` farklı.
 *
 * `QNB_SECURE_TYPE` ile seçilir (varsayılan: 3DPay). Dökümandaki alan/hash farklıysa bankadan netleştirin.
 */

export type QnbSecureType = "3DHost" | "3DPay";

export function getQnbSecureType(): QnbSecureType {
  const force = process.env.QNB_FORCE_3DPAY?.trim().toLowerCase();
  if (force === "1" || force === "true" || force === "yes") {
    return "3DPay";
  }
  const v = (process.env.QNB_SECURE_TYPE?.trim().replace(/^\uFEFF/, "") ?? "").toLowerCase();
  if (v === "3dhost") return "3DHost";
  if (v === "3dpay") return "3DPay";
  return "3DPay";
}

function qnbUseMock(): boolean {
  const raw = process.env.QNB_USE_MOCK?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  const nodeEnv = process.env.NODE_ENV ?? "";
  const vercelEnv = process.env.VERCEL_ENV ?? "";
  /** Canlı (NODE_ENV veya Vercel production): mock kapalı; açık `QNB_USE_MOCK=true` yukarıda yakalanır. */
  if (vercelEnv === "production" || nodeEnv === "production") {
    return false;
  }
  /** Geliştirme / önizleme: eski davranış — açık false değilse mock açık (yerel banka adımı atlanır). */
  return true;
}

/** Sırlar yok; checkout / qnb-baslat teşhisi için. */
export function getQnbFlowDebugMeta() {
  return {
    qnbSecureTypeEnv: process.env.QNB_SECURE_TYPE?.trim() ?? null,
    qnbForce3dpay: process.env.QNB_FORCE_3DPAY?.trim() ?? null,
    resolvedSecureType: getQnbSecureType(),
    qnbUseMock: qnbUseMock(),
    nodeEnv: process.env.NODE_ENV ?? null,
  };
}

export function getQnbGatewayUrl(secureType: QnbSecureType = getQnbSecureType()): string {
  const custom = process.env.QNB_GATEWAY_URL?.trim();
  if (custom) return custom;
  const live = process.env.QNB_TEST_MODE === "0";
  const host = live ? "https://vpos.qnb.com.tr/Gateway" : "https://vpostest.qnb.com.tr/Gateway";
  return secureType === "3DPay" ? `${host}/Default.aspx` : `${host}/3DHost.aspx`;
}

/**
 * Banka arayüz incelemesi: QNB ortam değişkenleri yokken `/odeme/qnb-baslat` üzerinde demo kart ekranı gösterilir.
 * Gerçek ödeme yok; `BANK_REVIEW_MODE=false` ve tam QNB env ile mevcut 3DPay/3DHost akışı kullanılır.
 *
 * Vercel / panellerde değer bazen `"true"` veya BOM ile gelir; normalize edilir.
 */
export function isBankReviewMode(): boolean {
  const raw = process.env.BANK_REVIEW_MODE;
  if (raw == null || raw === "") return false;
  let v = raw.replace(/^\uFEFF+/, "").trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  const n = v.toLowerCase();
  return n === "true" || n === "1" || n === "yes" || n === "on";
}

export function getQnbCredentials():
  | {
      ok: true;
      mbrId: string;
      merchantId: string;
      userCode: string;
      userPass: string;
      merchantPass: string;
    }
  | { ok: false } {
  const mbrId = process.env.QNB_MBR_ID?.trim() ?? "";
  const merchantId = process.env.QNB_MERCHANT_ID?.trim() ?? "";
  const userCode = process.env.QNB_USER_CODE?.trim() ?? "";
  const userPass = process.env.QNB_USER_PASS?.trim() ?? "";
  const merchantPass = process.env.QNB_MERCHANT_PASS?.trim() ?? "";
  if (!mbrId || !merchantId || !userCode || !userPass || !merchantPass) {
    return { ok: false };
  }
  return { ok: true, mbrId, merchantId, userCode, userPass, merchantPass };
}

export function getMissingQnbCredentialEnvNames(): string[] {
  const pairs: [string, string][] = [
    ["QNB_MBR_ID", process.env.QNB_MBR_ID?.trim() ?? ""],
    ["QNB_MERCHANT_ID", process.env.QNB_MERCHANT_ID?.trim() ?? ""],
    ["QNB_USER_CODE", process.env.QNB_USER_CODE?.trim() ?? ""],
    ["QNB_USER_PASS", process.env.QNB_USER_PASS?.trim() ?? ""],
    ["QNB_MERCHANT_PASS", process.env.QNB_MERCHANT_PASS?.trim() ?? ""],
  ];
  return pairs.filter(([, v]) => !v).map(([k]) => k);
}

/** Sırlar döndürülmez; yalnızca yapılandırma özeti (log / teşhis). */
export function getQnbPaymentConfig() {
  const cred = getQnbCredentials();
  const secureType = getQnbSecureType();
  const customGateway = Boolean(process.env.QNB_GATEWAY_URL?.trim());
  return {
    credentialsOk: cred.ok,
    missingCredentialEnvNames: cred.ok ? [] : getMissingQnbCredentialEnvNames(),
    secureType,
    qnbSecureTypeEnv: process.env.QNB_SECURE_TYPE?.trim() ?? null,
    qnbForce3dpay: process.env.QNB_FORCE_3DPAY?.trim() ?? null,
    qnbTestMode: process.env.QNB_TEST_MODE?.trim() ?? null,
    customGatewayUrlSet: customGateway,
    gatewayUrlForCurrentSecureType: getQnbGatewayUrl(secureType),
    nextPublicSiteUrlSet: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()),
    qnbUseMock: qnbUseMock(),
  };
}

/**
 * PayFor3D (Laravel örneği) ile uyumlu istek özeti:
 * MbrId + OrderId + PurchAmount + OkUrl + FailUrl + TxnType + InstallmentCount + Rnd + MerchantPass → SHA1 → Base64
 */
export function buildQnbInitHash(params: {
  mbrId: string;
  orderId: string;
  purchAmount: string;
  okUrl: string;
  failUrl: string;
  txnType: string;
  installmentCount: string;
  rnd: string;
  merchantPass: string;
}): string {
  const hashtr =
    params.mbrId +
    params.orderId +
    params.purchAmount +
    params.okUrl +
    params.failUrl +
    params.txnType +
    params.installmentCount +
    params.rnd +
    params.merchantPass;
  return createHash("sha1").update(hashtr, "utf8").digest("base64");
}

export function makeQnbRnd(): string {
  return `${Date.now()}${randomBytes(8).toString("hex")}`;
}

export type QnbCheckoutFormBuilt =
  | { error: string }
  | { secureType: "3DHost"; gatewayUrl: string; fields: Record<string, string> }
  | { secureType: "3DPay"; gatewayUrl: string; hiddenFields: Record<string, string> };

/** Sunucu tarafı imzalı alanlar (+ 3DPay’de kart hariç gizli alanlar). */
export function buildQnbCheckoutFormFields(input: {
  orderId: string;
  purchAmount: string;
  okUrl: string;
  failUrl: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}): QnbCheckoutFormBuilt {
  const cred = getQnbCredentials();
  if (!cred.ok) {
    return { error: "QNB ortam değişkenleri eksik." };
  }
  const secureType = getQnbSecureType();
  const rnd = makeQnbRnd();
  const txnType = "Auth";
  const installmentCount = "0";
  const purchAmount = input.purchAmount.replace(",", ".").replace(/[^\d.]/g, "");
  const hash = buildQnbInitHash({
    mbrId: cred.mbrId,
    orderId: input.orderId,
    purchAmount,
    okUrl: input.okUrl,
    failUrl: input.failUrl,
    txnType,
    installmentCount,
    rnd,
    merchantPass: cred.merchantPass,
  });

  const baseFields: Record<string, string> = {
    MbrId: cred.mbrId,
    MerchantID: cred.merchantId,
    UserCode: cred.userCode,
    UserPass: cred.userPass,
    OrderId: input.orderId,
    PurchAmount: purchAmount,
    Currency: "949",
    OkUrl: input.okUrl,
    FailUrl: input.failUrl,
    TxnType: txnType,
    InstallmentCount: installmentCount,
    SecureType: secureType === "3DPay" ? "3DPay" : "3DHost",
    Lang: "TR",
    Rnd: rnd,
    Hash: hash,
    PurchaserName: input.customerName.trim().slice(0, 64),
    PurchaserEmail: input.customerEmail.trim().slice(0, 128),
    PurchaserPhone: input.customerPhone.replace(/\s/g, "").slice(0, 20),
  };

  const gatewayUrl = getQnbGatewayUrl(secureType);
  if (secureType === "3DPay") {
    return { secureType: "3DPay", gatewayUrl, hiddenFields: baseFields };
  }
  return { secureType: "3DHost", gatewayUrl, fields: baseFields };
}

export async function initializeQnbPayment(payload: PaymentInitPayload): Promise<PaymentInitResult> {
  if (qnbUseMock()) {
    let origin: string;
    try {
      origin = new URL(payload.successUrl).origin;
    } catch {
      origin = "";
    }
    /** Başarı sayfasına gitmeyelim: sipariş pending kalır, “doğrulama bekleniyor” yanıltır. */
    const mockLanding = origin
      ? `${origin}/odeme/qnb-mock?oid=${encodeURIComponent(payload.orderId)}`
      : payload.successUrl;
    if (isPaymentFlowDebugEnabled()) {
      logPayment("info", "QNB init (mock).", {
        ...getQnbFlowDebugMeta(),
        orderId: payload.orderId,
        redirectUrl: mockLanding,
      });
    }
    return {
      ok: true,
      redirectUrl: mockLanding,
      reference: `qnb_mock_${payload.orderId}`,
      raw: { mode: "mock", ...getQnbFlowDebugMeta() },
    };
  }
  const cred = getQnbCredentials();
  let origin: string;
  try {
    origin = new URL(payload.successUrl).origin;
  } catch {
    return { ok: false, error: "Geçersiz site URL’si.", errorCode: "INIT_FAILED" };
  }

  const bankReview = isBankReviewMode();
  const missingKeys = getMissingQnbCredentialEnvNames();
  const modeAfterCred = !cred.ok ? (bankReview ? "bank_review_demo" : "config_missing") : "qnb_baslat";
  let diagRedirect: string | null = null;
  let diagErrorCode: string | undefined;
  if (!cred.ok && bankReview) {
    diagRedirect = `${origin}/odeme/qnb-baslat/${payload.orderId}`;
  } else if (!cred.ok) {
    diagErrorCode = "CONFIG_MISSING";
  } else {
    diagRedirect = `${origin}/odeme/qnb-baslat/${payload.orderId}`;
  }
  /** Geçici teşhis (Vercel function log): BANK_REVIEW_MODE okunuyor mu. */
  logPayment("info", "qnb-checkout-init-diag", {
    BANK_REVIEW_MODE_value: process.env.BANK_REVIEW_MODE ?? null,
    isBankReviewMode_result: bankReview,
    missingQnbKeys: missingKeys,
    selectedPaymentMode: modeAfterCred,
    returnedRedirectUrl: diagRedirect,
    returnedErrorCode: diagErrorCode ?? null,
    credentialsOk: cred.ok,
    orderId: payload.orderId,
  });

  if (!cred.ok) {
    if (bankReview) {
      const redirectUrl = `${origin}/odeme/qnb-baslat/${payload.orderId}`;
      const brMeta = { mode: "bank_review_demo" as const, bankReviewMode: true, ...getQnbFlowDebugMeta() };
      if (isPaymentFlowDebugEnabled()) {
        logPayment("info", "QNB init (bank review → qnb-baslat demo, gerçek ödeme yok).", {
          ...brMeta,
          orderId: payload.orderId,
          redirectUrl,
        });
      }
      return {
        ok: true,
        redirectUrl,
        reference: `qnb_bank_review_${payload.orderId}`,
        raw: brMeta,
      };
    }
    logPayment("error", "QNB config missing during init.");
    return { ok: false, error: "QNB ortam değişkenleri eksik.", errorCode: "CONFIG_MISSING" };
  }

  const redirectUrl = `${origin}/odeme/qnb-baslat/${payload.orderId}`;
  const liveMeta = { mode: "qnb_baslat" as const, ...getQnbFlowDebugMeta() };
  if (isPaymentFlowDebugEnabled()) {
    logPayment("info", "QNB init (live → kart adımı).", {
      ...liveMeta,
      orderId: payload.orderId,
      redirectUrl,
    });
  }
  return {
    ok: true,
    redirectUrl,
    reference: `qnb_start_${payload.orderId}`,
    raw: liveMeta,
  };
}

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return v == null ? "" : String(v).trim();
}

/**
 * Dönüş hash’i: banka dökümanına göre değişebilir. Yaygın bir NestPay varyantı.
 * Eşleşmezse `QNB_RELAX_RETURN_HASH=true` ile yalnızca ProcReturnCode kontrolü (geliştirme / geçiş).
 */
function verifyQnbReturnHash(fd: FormData, merchantPass: string): boolean {
  const relax = process.env.QNB_RELAX_RETURN_HASH === "true";
  if (relax) {
    logPayment("warn", "QNB return hash verification skipped (QNB_RELAX_RETURN_HASH).");
    return true;
  }
  const mbrId = str(fd, "MbrId");
  const orderId = str(fd, "OrderId");
  const purchAmount = str(fd, "PurchAmount").replace(",", ".");
  const authCode = str(fd, "AuthCode");
  const procReturnCode = str(fd, "ProcReturnCode");
  const txnType = str(fd, "TxnType") || "Auth";
  const rnd = str(fd, "Rnd");
  const received =
    str(fd, "Hash") ||
    str(fd, "HASH") ||
    str(fd, "ResponseHash") ||
    str(fd, "Response_Hash");

  if (!received || !mbrId || !orderId) return false;

  const candidates = [
    `${mbrId}${orderId}${purchAmount}${authCode}${procReturnCode}${txnType}${rnd}${merchantPass}`,
    `${mbrId}${orderId}${authCode}${procReturnCode}${txnType}${rnd}${merchantPass}`,
  ];
  for (const hashtr of candidates) {
    const expected = createHash("sha1").update(hashtr, "utf8").digest("base64");
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(received);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

export async function parseQnbReturnForm(fd: FormData): Promise<PaymentCallbackResult> {
  const cred = getQnbCredentials();
  if (!cred.ok) {
    return { ok: false, error: "QNB ortam değişkenleri eksik.", errorCode: "CONFIG_MISSING" };
  }

  const raw = Object.fromEntries(Array.from(fd.entries()).map(([k, v]) => [k, String(v)]));
  const orderId = str(fd, "OrderId");
  if (!orderId) {
    return { ok: false, error: "OrderId eksik.", errorCode: "CALLBACK_INVALID" };
  }

  const procReturnCode = str(fd, "ProcReturnCode");
  const claimedOk = procReturnCode === "00";
  const relax = process.env.QNB_RELAX_RETURN_HASH === "true";
  const hashOk = verifyQnbReturnHash(fd, cred.merchantPass);
  if (claimedOk && !hashOk && !relax) {
    logPayment("warn", "QNB return hash doğrulanamadı (başarılı işlem).", { orderId, procReturnCode });
    return { ok: false, error: "Hash doğrulanamadı.", errorCode: "CALLBACK_SIGNATURE_INVALID" };
  }
  const ok = claimedOk;

  const amountRaw = str(fd, "PurchAmount") || str(fd, "Amount");
  const amount = amountRaw ? Number(amountRaw.replace(",", ".")) : null;
  const reference = str(fd, "TransId") || str(fd, "HostRefNum") || str(fd, "AuthCode") || null;
  const callbackHash =
    str(fd, "Hash") || str(fd, "HASH") || str(fd, "ResponseHash") || str(fd, "Response_Hash") || `qnb_${orderId}_${procReturnCode}`;

  const payload: PaymentCallbackPayload = {
    orderId,
    reference: reference ?? undefined,
    status: ok ? "success" : "failed",
    provider: "qnb_finansbank",
    callbackHash,
    amount: Number.isFinite(amount) ? amount : null,
    raw,
  };

  return { ok: true, payload };
}
