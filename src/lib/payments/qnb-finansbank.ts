import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type {
  PaymentCallbackPayload,
  PaymentCallbackResult,
  PaymentInitPayload,
  PaymentInitResult,
} from "@/lib/payments/types";
import { QNB_3DPAY_REQUIRED_HIDDEN_KEYS } from "@/lib/payments/qnb-3dpay-guards";
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

const QNB_VPOS_HOSTS = new Set(["vpos.qnb.com.tr", "vpostest.qnb.com.tr"]);

/**
 * QNB_GATEWAY_URL often mis-set to `https://vpos.qnb.com.tr` (site root) → bank redirects to
 * VPOS Yönetim / login, not the payment gateway. Force canonical `/Gateway/*.aspx` on known vPOS hosts.
 */
function normalizeCustomQnbGatewayUrl(input: string, secureType: QnbSecureType): string {
  const trimmed = input.trim();
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return trimmed;
  }
  const host = u.hostname.toLowerCase();
  if (!QNB_VPOS_HOSTS.has(host)) return trimmed;

  const pathLower = u.pathname.toLowerCase();
  const ok3dpay = pathLower.includes("/gateway/") && pathLower.endsWith("default.aspx");
  const ok3dhost = pathLower.includes("/gateway/") && pathLower.endsWith("3dhost.aspx");
  if (secureType === "3DPay" && ok3dpay) return trimmed;
  if (secureType === "3DHost" && ok3dhost) return trimmed;

  const canonicalPath = secureType === "3DPay" ? "/Gateway/Default.aspx" : "/Gateway/3DHost.aspx";
  return `${u.origin}${canonicalPath}`;
}

/** Non-secret routing snapshot for `QNB_PAY_FLOW_DEBUG` UI (no credentials). */
export function getQnbGatewayRoutingDebug(secureType: QnbSecureType = getQnbSecureType()) {
  const rawOverride = process.env.QNB_GATEWAY_URL?.trim() ?? null;
  const resolved = getQnbGatewayUrl(secureType);
  return {
    secureType,
    qnbTestModeRaw: process.env.QNB_TEST_MODE?.trim() ?? null,
    qnbTestModeLiveHost: process.env.QNB_TEST_MODE === "0",
    qnbGatewayUrlOverrideSet: Boolean(rawOverride),
    gatewayUrlResolved: resolved,
  };
}

export function getQnbGatewayUrl(secureType: QnbSecureType = getQnbSecureType()): string {
  const custom = process.env.QNB_GATEWAY_URL?.trim();
  if (custom) {
    const normalized = normalizeCustomQnbGatewayUrl(custom, secureType);
    if (normalized !== custom && isPaymentFlowDebugEnabled()) {
      logPayment("warn", "QNB_GATEWAY_URL was not a full Gateway *.aspx path; normalized for known vPOS host.", {
        secureType,
      });
    }
    return normalized;
  }
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

/** Vercel panelinden gelen BOM / tırnak sarmalayıcıları temizle (hash’i bozar). */
export function normalizeQnbEnvValue(raw: string | undefined | null): string {
  if (raw == null) return "";
  let v = raw.replace(/^\uFEFF+/, "").trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
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
  const mbrId = normalizeQnbEnvValue(process.env.QNB_MBR_ID);
  const merchantId = normalizeQnbEnvValue(process.env.QNB_MERCHANT_ID);
  const userCode = normalizeQnbEnvValue(process.env.QNB_USER_CODE);
  const userPass = normalizeQnbEnvValue(process.env.QNB_USER_PASS);
  /** NestPay/Wix “StoreKey” = QNB “Üye İşyeri 3D Şifresi” (API şifresi DEĞİL). */
  const merchantPass = normalizeQnbEnvValue(process.env.QNB_MERCHANT_PASS);
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

/** Non-secret: unset/empty env **names** only. Never returns or logs values. */
export function getMissingQnbEnvNamesForDiagnostics(): string[] {
  const names: string[] = [];
  if (!process.env.NEXT_PUBLIC_SITE_URL?.trim()) names.push("NEXT_PUBLIC_SITE_URL");
  for (const k of getMissingQnbCredentialEnvNames()) {
    if (!names.includes(k)) names.push(k);
  }
  return names;
}

/**
 * Non-secret: env **names** that are usually wrong for live (values never returned).
 * Empty when live-oriented flags look correct.
 */
export function getQnbLiveConfigurationEnvHintNames(): string[] {
  const hints: string[] = [];
  if (process.env.QNB_TEST_MODE?.trim() !== "0") hints.push("QNB_TEST_MODE");
  const mock = process.env.QNB_USE_MOCK?.trim().toLowerCase();
  if (mock === "true" || mock === "1") hints.push("QNB_USE_MOCK");
  if (process.env.QNB_RELAX_RETURN_HASH === "true") hints.push("QNB_RELAX_RETURN_HASH");
  return hints;
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
 * QNB vPOS Help “Generate Hash” aracı ve 3DPay kod örnekleri (vpos.qnb.com.tr/Help) ile aynı sıra.
 * Currency / SecureType hash’e dahil değildir.
 *
 * SHA-1 → Base64 (`digest("base64")`). Node tarafında UTF-8; Help’teki Java örneği charset belirtmez —
 * OkUrl/FailUrl yalnızca ASCII ise pratikte fark oluşmaz.
 */
export const QNB_OFFICIAL_INIT_HASH_FIELD_ORDER =
  "MbrId+OrderId+PurchAmount+OkUrl+FailUrl+TxnType+InstallmentCount+Rnd+MerchantPass" as const;

export type QnbPurchAmountFormatAudit = {
  formatted: string;
  decimalSeparator: "." | ",";
  fractionDigits: number;
  hadCommaInput: boolean;
};

/**
 * QNB 3DPay init hash + POST PurchAmount: her zaman nokta ve 2 ondalık (örn. `350.00`).
 * Tam sayı (`350`) veya virgül (`350,00`) burada normalize edilir.
 */
export function formatQnbPurchAmountStrictDot(raw: string | number): string {
  const normalized = String(raw).replace(",", ".").replace(/[^\d.]/g, "");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) {
    return normalized.includes(".") ? Number(normalized).toFixed(2) : "0.00";
  }
  return n.toFixed(2);
}

/** QNB Help: tutar hash ile POST’ta aynı string — zorunlu `NNN.NN` (nokta). */
export function formatQnbPurchAmountForGateway(raw: string): QnbPurchAmountFormatAudit {
  const hadCommaInput = raw.includes(",");
  const formatted = formatQnbPurchAmountStrictDot(raw);
  return {
    formatted,
    decimalSeparator: ".",
    fractionDigits: 2,
    hadCommaInput,
  };
}

/** Init hash girdileri — POST hidden alanları ile birebir aynı referans kullanılmalı. */
export type QnbInitHashInputs = {
  mbrId: string;
  orderId: string;
  purchAmount: string;
  okUrl: string;
  failUrl: string;
  txnType: string;
  installmentCount: string;
  rnd: string;
  merchantPass: string;
};

/** MerchantPass hariç hash düz metni (log / Help aracı karşılaştırması). */
export function qnbInitHashPublicPlainText(
  inputs: Omit<QnbInitHashInputs, "merchantPass">,
): string {
  return (
    inputs.mbrId +
    inputs.orderId +
    inputs.purchAmount +
    inputs.okUrl +
    inputs.failUrl +
    inputs.txnType +
    inputs.installmentCount +
    inputs.rnd
  );
}

/**
 * Hash öncesi teşhis — Vercel function loglarında görünür (console.info).
 * MerchantPass değeri asla yazılmaz; yalnızca uzunluk + MerchantPass öncesi düz metin.
 */
export function logQnbInitHashPreDigest(inputs: QnbInitHashInputs, hashBase64: string): void {
  const publicPlain = qnbInitHashPublicPlainText(inputs);
  logPayment("info", "qnb-init-hash: hash öncesi düz metin ve alanlar (MerchantPass değeri yok).", {
    hashFieldOrder: QNB_OFFICIAL_INIT_HASH_FIELD_ORDER,
    MbrId: inputs.mbrId,
    OrderId: inputs.orderId,
    PurchAmount: inputs.purchAmount,
    OkUrl: inputs.okUrl,
    FailUrl: inputs.failUrl,
    TxnType: inputs.txnType,
    InstallmentCount: inputs.installmentCount,
    Rnd: inputs.rnd,
    merchantPassLength: inputs.merchantPass.length,
    hashPlainTextPublic: publicPlain,
    hashPlainTextPublicLength: publicPlain.length,
    hashPlainTextFullLength: publicPlain.length + inputs.merchantPass.length,
    hashBase64,
  });
}

/** POST hidden alanları ile hash girdilerinin karakter karakter aynı olduğunu doğrula. */
export function verifyQnbPostMatchesHashInputs(
  post: Record<string, string>,
  inputs: QnbInitHashInputs,
  hashBase64: string,
): { ok: boolean; mismatches: string[] } {
  const mismatches: string[] = [];
  const checks: [string, string, string][] = [
    ["MbrId", post.MbrId ?? "", inputs.mbrId],
    ["OrderId", post.OrderId ?? "", inputs.orderId],
    ["PurchAmount", post.PurchAmount ?? "", inputs.purchAmount],
    ["OkUrl", post.OkUrl ?? "", inputs.okUrl],
    ["FailUrl", post.FailUrl ?? "", inputs.failUrl],
    ["TxnType", post.TxnType ?? "", inputs.txnType],
    ["InstallmentCount", post.InstallmentCount ?? "", inputs.installmentCount],
    ["Rnd", post.Rnd ?? "", inputs.rnd],
    ["Hash", post.Hash ?? "", hashBase64],
  ];
  for (const [name, postVal, hashVal] of checks) {
    if (postVal !== hashVal) {
      mismatches.push(`${name}: post="${postVal}" hash="${hashVal}"`);
    }
  }
  if (mismatches.length > 0) {
    logPayment("error", "qnb-init-hash: POST alanları hash girdileri ile uyuşmuyor.", {
      orderId: inputs.orderId,
      mismatches,
    });
  } else {
    logPayment("info", "qnb-init-hash: POST PurchAmount/OrderId/Rnd/Hash hash girdileri ile birebir eşleşti.", {
      orderId: inputs.orderId,
      PurchAmount: inputs.purchAmount,
      Rnd: inputs.rnd,
    });
  }
  return { ok: mismatches.length === 0, mismatches };
}

/** PayFor / QNB Help: SHA-1 (binary) → Base64 — PHP `base64_encode(pack('H*', sha1($s)))` ile aynı. */
export function digestQnbSha1Base64(hashtr: string): string {
  return createHash("sha1").update(hashtr, "utf8").digest("base64");
}

export type QnbInitHashAudit = {
  hashFieldOrder: typeof QNB_OFFICIAL_INIT_HASH_FIELD_ORDER;
  hashConcatLengthExcludingMerchantPass: number;
  merchantPassLength: number;
  hashConcatLengthIncludingMerchantPass: number;
  purchAmountFormatted: string;
  purchAmountDecimalSeparator: "." | ",";
  purchAmountFractionDigits: number;
  txnType: string;
  installmentCount: string;
  currencyInHash: false;
  encoding: "utf8";
  orderIdLength: number;
  orderIdHasHyphens: boolean;
  okUrlLength: number;
  failUrlLength: number;
  rndLength: number;
  mbrIdLength: number;
};

/** Hash kaynağı uzunlukları — MerchantPass yalnızca uzunluk; değer loglanmaz. */
export function getQnbInitHashAudit(params: {
  mbrId: string;
  orderId: string;
  purchAmount: string;
  okUrl: string;
  failUrl: string;
  txnType: string;
  installmentCount: string;
  rnd: string;
  merchantPass: string;
}): QnbInitHashAudit {
  const publicPart =
    params.mbrId +
    params.orderId +
    params.purchAmount +
    params.okUrl +
    params.failUrl +
    params.txnType +
    params.installmentCount +
    params.rnd;
  const passLen = params.merchantPass.length;
  const amountAudit = formatQnbPurchAmountForGateway(params.purchAmount);
  return {
    hashFieldOrder: QNB_OFFICIAL_INIT_HASH_FIELD_ORDER,
    hashConcatLengthExcludingMerchantPass: publicPart.length,
    merchantPassLength: passLen,
    hashConcatLengthIncludingMerchantPass: publicPart.length + passLen,
    purchAmountFormatted: amountAudit.formatted,
    purchAmountDecimalSeparator: amountAudit.decimalSeparator,
    purchAmountFractionDigits: amountAudit.fractionDigits,
    txnType: params.txnType,
    installmentCount: params.installmentCount,
    currencyInHash: false,
    encoding: "utf8",
    orderIdLength: params.orderId.length,
    orderIdHasHyphens: params.orderId.includes("-"),
    okUrlLength: params.okUrl.length,
    failUrlLength: params.failUrl.length,
    rndLength: params.rnd.length,
    mbrIdLength: params.mbrId.length,
  };
}

export function buildQnbInitHash(params: QnbInitHashInputs): string {
  const publicPlain = qnbInitHashPublicPlainText(params);
  const hashtr = publicPlain + params.merchantPass;
  const hash = digestQnbSha1Base64(hashtr);
  logQnbInitHashPreDigest(params, hash);
  return hash;
}

export function makeQnbRnd(): string {
  return `${Date.now()}${randomBytes(8).toString("hex")}`;
}

/** QNB Help — 3DPay Gateway/Default.aspx örnek POST alanları (Pan/Expiry/Cvv2 dahil). */
export const QNB_HELP_3DPAY_DOC_FIELD_NAMES = [
  "MbrId",
  "MerchantID",
  "MerchantPass",
  "UserCode",
  "UserPass",
  "SecureType",
  "TxnType",
  "InstallmentCount",
  "Currency",
  "OkUrl",
  "FailUrl",
  "OrderId",
  "PurchAmount",
  "Lang",
  "Rnd",
  "Hash",
  "Pan",
  "Expiry",
  "Cvv2",
] as const;

/** QNB Help 3DPay ASP örneğindeki POST alan sırası (Gateway/Default.aspx). */
export const QNB_3DPAY_POST_FIELD_ORDER: readonly string[] = [
  "MbrId",
  "MerchantID",
  "MerchantPass",
  "UserCode",
  "UserPass",
  "SecureType",
  "TxnType",
  "InstallmentCount",
  "Currency",
  "OkUrl",
  "FailUrl",
  "OrderId",
  "PurchAmount",
  "Lang",
  "Rnd",
  "Hash",
  "Pan",
  "Expiry",
  "Cvv2",
];

/**
 * QNB Help 3DPay örneği POST’ta MerchantPass içerir (sunucu→banka; tarayıcıya verilmez).
 * `QNB_OMIT_MERCHANT_PASS_IN_POST=true` ile kapatılabilir (yalnızca banka “göndermeyin” derse).
 */
export function shouldPostMerchantPassIn3DPay(): boolean {
  const raw = process.env.QNB_OMIT_MERCHANT_PASS_IN_POST?.trim().toLowerCase();
  return raw !== "true" && raw !== "1" && raw !== "yes";
}

export function buildQnb3DPayPostBody(fields: Record<string, string>): string {
  const params = new URLSearchParams();
  const used = new Set<string>();
  for (const key of QNB_3DPAY_POST_FIELD_ORDER) {
    const v = fields[key];
    if (v == null || String(v).trim() === "") continue;
    params.append(key, String(v));
    used.add(key);
  }
  for (const [k, v] of Object.entries(fields)) {
    if (used.has(k) || v == null || String(v).trim() === "") continue;
    params.append(k, String(v));
  }
  return params.toString();
}

/** Banka VPOS yönetim girişi (3DS değil) — müşteriye bu HTML gösterilmemeli. */
export function isQnbVposMerchantLoginResponse(html: string, responseUrl: string): boolean {
  const url = responseUrl.toLowerCase();
  if (url.includes("/login")) return true;
  const h = html.toLowerCase();
  if (h.includes("sifremi unuttum") || h.includes("şifremi unuttum")) return true;
  const hasUserField =
    h.includes("kullanici adi") ||
    h.includes("kullanıcı adı") ||
    h.includes("kullan&#305;c&#305; ad&#305;");
  const hasPassword = h.includes("type=\"password\"") || h.includes("type='password'");
  const hasCaptcha = h.includes("doğrulama") || h.includes("dogrulama");
  if (hasUserField && hasPassword && (hasCaptcha || h.includes("sanalpos@qnb.com.tr"))) return true;
  return false;
}

export type Qnb3DPayOutgoingDebugSummary = {
  outgoingFieldCount: number;
  outgoingFieldNamesSorted: string[];
  hashGenerated: boolean;
  orderIdPresent: boolean;
  okUrlPresent: boolean;
  failUrlPresent: boolean;
  secureType: string | null;
  txnType: string | null;
  currency: string | null;
  installmentCount: string | null;
  requiredDocKeysPresent: boolean;
  missingDocKeys: string[];
  merchantPassFieldInPost: boolean;
  extraFieldNamesBeyondHelpDoc: string[];
  helpDocFieldNamesMissingFromPost: string[];
};

/** QNB 3DPay gizli form alanları — `QNB_3DPAY_REQUIRED_HIDDEN_KEYS` ile aynı kümeyi kullanın (qnb-3dpay-guards). */
export function getQnb3DPayOutgoingDebugSummary(fields: Record<string, string>): Qnb3DPayOutgoingDebugSummary {
  const names = Object.keys(fields);
  const missing: string[] = [];
  for (const k of QNB_3DPAY_REQUIRED_HIDDEN_KEYS) {
    if (!String(fields[k] ?? "").trim()) missing.push(k);
  }
  const helpSet = new Set<string>(QNB_HELP_3DPAY_DOC_FIELD_NAMES);
  const extraFieldNamesBeyondHelpDoc = names.filter((n) => !helpSet.has(n)).sort();
  const helpDocFieldNamesMissingFromPost = QNB_HELP_3DPAY_DOC_FIELD_NAMES.filter(
    (n) => !names.includes(n) || !String(fields[n] ?? "").trim(),
  );
  return {
    outgoingFieldCount: names.length,
    outgoingFieldNamesSorted: [...names].sort(),
    hashGenerated: Boolean(String(fields.Hash ?? "").trim()),
    orderIdPresent: Boolean(String(fields.OrderId ?? "").trim()),
    okUrlPresent: Boolean(String(fields.OkUrl ?? "").trim()),
    failUrlPresent: Boolean(String(fields.FailUrl ?? "").trim()),
    secureType: String(fields.SecureType ?? "").trim() || null,
    txnType: String(fields.TxnType ?? "").trim() || null,
    currency: String(fields.Currency ?? "").trim() || null,
    installmentCount: String(fields.InstallmentCount ?? "").trim() || null,
    requiredDocKeysPresent: missing.length === 0,
    missingDocKeys: missing,
    merchantPassFieldInPost: Boolean(String(fields.MerchantPass ?? "").trim()),
    extraFieldNamesBeyondHelpDoc,
    helpDocFieldNamesMissingFromPost: [...helpDocFieldNamesMissingFromPost],
  };
}

export type Qnb3DPayPayloadAudit = Qnb3DPayOutgoingDebugSummary & {
  hashAudit: QnbInitHashAudit;
  secureTypeSelected: string;
};

/** Sunucu teşhisi: alan adları + tutar/hash meta; sırlar ve kart yok. */
export function getQnb3DPayPayloadAudit(
  postFields: Record<string, string>,
  cred: { mbrId: string; merchantPass: string },
): Qnb3DPayPayloadAudit {
  const summary = getQnb3DPayOutgoingDebugSummary(postFields);
  const hashAudit = getQnbInitHashAudit({
    mbrId: cred.mbrId,
    orderId: String(postFields.OrderId ?? ""),
    purchAmount: String(postFields.PurchAmount ?? ""),
    okUrl: String(postFields.OkUrl ?? ""),
    failUrl: String(postFields.FailUrl ?? ""),
    txnType: String(postFields.TxnType ?? ""),
    installmentCount: String(postFields.InstallmentCount ?? ""),
    rnd: String(postFields.Rnd ?? ""),
    merchantPass: cred.merchantPass,
  });
  return {
    ...summary,
    hashAudit,
    secureTypeSelected: String(postFields.SecureType ?? "").trim() || "(empty)",
  };
}

export type QnbCheckoutFormBuilt =
  | { error: string }
  | { secureType: "3DHost"; gatewayUrl: string; fields: Record<string, string> }
  | { secureType: "3DPay"; gatewayUrl: string; hiddenFields: Record<string, string> };

/** Sunucu tarafı imzalı alanlar (+ 3DPay’de kart hariç gizli alanlar). */
export function buildQnbCheckoutFormFields(
  input: {
    orderId: string;
    purchAmount: string;
    okUrl: string;
    failUrl: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  },
  /** Env yerine belirli bir güvenlik tipini zorla (örn. tarayıcıdan 3DHost yönlendirmesi). */
  forceSecureType?: QnbSecureType,
): QnbCheckoutFormBuilt {
  const cred = getQnbCredentials();
  if (!cred.ok) {
    return { error: "QNB ortam değişkenleri eksik." };
  }
  const secureType = forceSecureType ?? getQnbSecureType();
  const rnd = makeQnbRnd();
  const txnType = "Auth";
  const installmentCount = "0";
  const purchAmount = formatQnbPurchAmountStrictDot(input.purchAmount);
  const okUrl = input.okUrl.trim();
  const failUrl = input.failUrl.trim();
  const orderId = String(input.orderId).trim();

  const hashInputs: QnbInitHashInputs = {
    mbrId: cred.mbrId,
    orderId,
    purchAmount,
    okUrl,
    failUrl,
    txnType,
    installmentCount,
    rnd,
    merchantPass: cred.merchantPass,
  };
  const hash = buildQnbInitHash(hashInputs);

  const gatewayUrl = getQnbGatewayUrl(secureType);

  if (secureType === "3DPay") {
    const hiddenFields: Record<string, string> = {
      MbrId: cred.mbrId,
      MerchantID: cred.merchantId,
      UserCode: cred.userCode,
      UserPass: cred.userPass,
      SecureType: "3DPay",
      TxnType: txnType,
      InstallmentCount: installmentCount,
      Currency: "949",
      OkUrl: okUrl,
      FailUrl: failUrl,
      OrderId: orderId,
      PurchAmount: purchAmount,
      Lang: "TR",
      Rnd: rnd,
      Hash: hash,
    };
    if (shouldPostMerchantPassIn3DPay()) {
      hiddenFields.MerchantPass = cred.merchantPass;
    }
    verifyQnbPostMatchesHashInputs(hiddenFields, hashInputs, hash);
    return { secureType: "3DPay", gatewayUrl, hiddenFields };
  }

  const fields: Record<string, string> = {
    MbrId: cred.mbrId,
    MerchantID: cred.merchantId,
    UserCode: cred.userCode,
    UserPass: cred.userPass,
    OrderId: orderId,
    PurchAmount: purchAmount,
    Currency: "949",
    OkUrl: okUrl,
    FailUrl: failUrl,
    TxnType: txnType,
    InstallmentCount: installmentCount,
    SecureType: "3DHost",
    Lang: "TR",
    Rnd: rnd,
    Hash: hash,
    PurchaserName: input.customerName.trim().slice(0, 64),
    PurchaserEmail: input.customerEmail.trim().slice(0, 128),
    PurchaserPhone: input.customerPhone.replace(/\s/g, "").slice(0, 20),
  };
  return { secureType: "3DHost", gatewayUrl, fields };
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

/** Banka dönüşü — sırlar hariç (log / müşteri mesajı). */
export function getQnbReturnCallbackDiagnostics(fd: FormData): {
  procReturnCode: string;
  errMsg: string;
  authCode: string;
  transId: string;
  responseFieldNames: string[];
} {
  const errMsg = str(fd, "ErrMsg") || str(fd, "ErrorMessage") || str(fd, "ERRORMSG") || "";
  return {
    procReturnCode: str(fd, "ProcReturnCode"),
    errMsg: errMsg.slice(0, 240),
    authCode: str(fd, "AuthCode"),
    transId: str(fd, "TransId") || str(fd, "HostRefNum"),
    responseFieldNames: Array.from(new Set(Array.from(fd.keys()).map(String))).sort(),
  };
}

function qnbReturnHashMatches(received: string, hashtr: string): boolean {
  const expected = digestQnbSha1Base64(hashtr);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Dönüş hash’i (PayFor 3DPay): ResponseHash = Base64(SHA1(
 *   MerchantID + MerchantPass + OrderId + AuthCode + ProcReturnCode + 3DStatus + ResponseRnd + UserCode
 * )).
 * Eşleşmezse `QNB_RELAX_RETURN_HASH=true` (yalnızca geliştirme).
 */
function verifyQnbReturnHash(
  fd: FormData,
  cred: { mbrId: string; merchantId: string; merchantPass: string; userCode: string },
): boolean {
  const relax = process.env.QNB_RELAX_RETURN_HASH === "true";
  if (relax) {
    logPayment("warn", "QNB return hash verification skipped (QNB_RELAX_RETURN_HASH).");
    return true;
  }
  const orderId = str(fd, "OrderId");
  const received =
    str(fd, "ResponseHash") ||
    str(fd, "Response_Hash") ||
    str(fd, "Hash") ||
    str(fd, "HASH");

  if (!received || !orderId) return false;

  const authCode = str(fd, "AuthCode");
  const procReturnCode = str(fd, "ProcReturnCode");
  const threeDStatus = str(fd, "3DStatus");
  const responseRnd = str(fd, "ResponseRnd") || str(fd, "Rnd");
  const purchAmount = str(fd, "PurchAmount");
  const purchAmountDot = purchAmount.replace(",", ".");
  const purchAmountComma = purchAmount.includes(",")
    ? purchAmount
    : purchAmountDot.replace(".", ",");
  const txnType = str(fd, "TxnType") || "Auth";
  const mbrId = str(fd, "MbrId") || cred.mbrId;

  const candidates = [
    `${cred.merchantId}${cred.merchantPass}${orderId}${authCode}${procReturnCode}${threeDStatus}${responseRnd}${cred.userCode}`,
    `${mbrId}${orderId}${purchAmount}${authCode}${procReturnCode}${txnType}${responseRnd}${cred.merchantPass}`,
    `${mbrId}${orderId}${purchAmountComma}${authCode}${procReturnCode}${txnType}${responseRnd}${cred.merchantPass}`,
    `${mbrId}${orderId}${purchAmountDot}${authCode}${procReturnCode}${txnType}${responseRnd}${cred.merchantPass}`,
    `${mbrId}${orderId}${authCode}${procReturnCode}${txnType}${responseRnd}${cred.merchantPass}`,
  ];

  for (const hashtr of candidates) {
    if (qnbReturnHashMatches(received, hashtr)) return true;
  }
  return false;
}

/**
 * Banka Hash alanı yoksa: aynı dakika içindeki tekrarlayan callback'leri tek anahtarda toplar.
 */
export function buildQnbFallbackCallbackHash(
  orderId: string,
  procReturnCode: string,
  now: Date = new Date(),
): string {
  const minuteBucket = Math.floor(now.getTime() / 60_000);
  return `qnb_${orderId}_${procReturnCode || "none"}_${minuteBucket}`;
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

  const diag = getQnbReturnCallbackDiagnostics(fd);
  const procReturnCode = diag.procReturnCode;
  const claimedOk = procReturnCode === "00";
  const relax = process.env.QNB_RELAX_RETURN_HASH === "true";
  const hashOk = verifyQnbReturnHash(fd, {
    mbrId: cred.mbrId,
    merchantId: cred.merchantId,
    merchantPass: cred.merchantPass,
    userCode: cred.userCode,
  });
  logPayment(claimedOk ? "info" : "warn", "QNB return callback alındı.", {
    orderId,
    procReturnCode: procReturnCode || "(boş)",
    errMsg: diag.errMsg || null,
    authCodePresent: Boolean(diag.authCode),
    transIdPresent: Boolean(diag.transId),
    hashVerified: hashOk,
    hashRelaxed: relax,
    responseFieldNames: diag.responseFieldNames,
  });
  if (claimedOk && !hashOk && !relax) {
    logPayment("warn", "QNB return hash doğrulanamadı (başarılı işlem).", { orderId, procReturnCode });
    return { ok: false, error: "Hash doğrulanamadı.", errorCode: "CALLBACK_SIGNATURE_INVALID" };
  }
  const ok = claimedOk;

  const amountRaw = str(fd, "PurchAmount") || str(fd, "Amount");
  const amount = amountRaw ? Number(amountRaw.replace(",", ".")) : null;
  const reference = str(fd, "TransId") || str(fd, "HostRefNum") || str(fd, "AuthCode") || null;
  const bankHash =
    str(fd, "Hash") || str(fd, "HASH") || str(fd, "ResponseHash") || str(fd, "Response_Hash") || "";
  const callbackHash = bankHash || buildQnbFallbackCallbackHash(orderId, procReturnCode);

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
