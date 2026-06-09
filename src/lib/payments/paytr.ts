import { createHmac } from "node:crypto";
import type {
  PaymentCallbackPayload,
  PaymentInitPayload,
  PaymentInitResult,
} from "@/lib/payments/types";

/**
 * PayTR iFrame API entegrasyonu.
 * - get-token: sunucudan PayTR'a imzalı istek → iframe token.
 * - callback (Bildirim URL): PayTR sunucu→sunucu ödeme sonucunu POST eder; hash doğrulanır.
 * Kart verisi PayTR'ın güvenli sayfasında girilir; bizde tutulmaz (IP whitelist derdi yok).
 */

const GET_TOKEN_URL = "https://www.paytr.com/odeme/api/get-token";
const IFRAME_BASE = "https://www.paytr.com/odeme/guvenli";

export function getPaytrConfig() {
  return {
    merchantId: (process.env.PAYTR_MERCHANT_ID ?? "").trim(),
    merchantKey: (process.env.PAYTR_MERCHANT_KEY ?? "").trim(),
    merchantSalt: (process.env.PAYTR_MERCHANT_SALT ?? "").trim(),
  };
}

export function hasPaytrCredentials(): boolean {
  const c = getPaytrConfig();
  return Boolean(c.merchantId && c.merchantKey && c.merchantSalt);
}

/** PAYTR_TEST_MODE=0 → canlı; aksi halde test (varsayılan güvenli taraf). */
export function paytrTestMode(): "0" | "1" {
  return (process.env.PAYTR_TEST_MODE ?? "").trim() === "0" ? "0" : "1";
}

/** PayTR merchant_oid yalnızca harf+rakam kabul eder; UUID tirelerini at. */
export function orderIdToMerchantOid(orderId: string): string {
  return String(orderId).replace(/[^a-zA-Z0-9]/g, "");
}

/** 32 hex'lik merchant_oid'i tekrar UUID biçimine çevir (aksi halde olduğu gibi döndür). */
export function merchantOidToOrderId(oid: string): string {
  const s = String(oid).trim();
  if (/^[0-9a-fA-F]{32}$/.test(s)) {
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`.toLowerCase();
  }
  return s;
}

export type PaytrTokenInput = {
  orderId: string;
  amount: number;
  email: string;
  userName: string;
  userPhone: string;
  userAddress: string;
  userIp: string;
  okUrl: string;
  failUrl: string;
};

export type PaytrTokenResult =
  | { ok: true; token: string; iframeUrl: string }
  | { ok: false; error: string };

/** PayTR get-token: imzalı istekle iframe token alır. */
export async function createPaytrIframeToken(input: PaytrTokenInput): Promise<PaytrTokenResult> {
  const cfg = getPaytrConfig();
  if (!cfg.merchantId || !cfg.merchantKey || !cfg.merchantSalt) {
    return { ok: false, error: "PayTR yapılandırması eksik (PAYTR_MERCHANT_ID/KEY/SALT)." };
  }

  const merchantOid = orderIdToMerchantOid(input.orderId);
  const paymentAmount = String(Math.round(Math.max(0, input.amount) * 100));
  const userBasket = Buffer.from(
    JSON.stringify([["Zelula Sipariş", Math.max(0, input.amount).toFixed(2), 1]]),
  ).toString("base64");
  const noInstallment = "0";
  const maxInstallment = "0";
  const currency = "TL";
  const testMode = paytrTestMode();
  const userIp = (input.userIp || "").trim() || "127.0.0.1";
  const email = input.email.trim();

  const hashStr =
    cfg.merchantId +
    userIp +
    merchantOid +
    email +
    paymentAmount +
    userBasket +
    noInstallment +
    maxInstallment +
    currency +
    testMode;
  const paytrToken = createHmac("sha256", cfg.merchantKey)
    .update(hashStr + cfg.merchantSalt)
    .digest("base64");

  const body = new URLSearchParams({
    merchant_id: cfg.merchantId,
    user_ip: userIp,
    merchant_oid: merchantOid,
    email,
    payment_amount: paymentAmount,
    paytr_token: paytrToken,
    user_basket: userBasket,
    debug_on: testMode === "1" ? "1" : "0",
    no_installment: noInstallment,
    max_installment: maxInstallment,
    user_name: input.userName.trim().slice(0, 60) || "Musteri",
    user_address: input.userAddress.trim().slice(0, 400) || "-",
    user_phone: input.userPhone.replace(/\s/g, "").slice(0, 20) || "-",
    merchant_ok_url: input.okUrl,
    merchant_fail_url: input.failUrl,
    timeout_limit: "30",
    currency,
    test_mode: testMode,
    lang: "tr",
    iframe_v2: "1",
  });

  let resp: Response;
  try {
    resp = await fetch(GET_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "PayTR ile bağlantı kurulamadı. Lütfen tekrar deneyin." };
  }

  let json: { status?: string; token?: string; reason?: string };
  try {
    json = (await resp.json()) as { status?: string; token?: string; reason?: string };
  } catch {
    return { ok: false, error: "PayTR yanıtı okunamadı." };
  }

  if (json.status === "success" && json.token) {
    return { ok: true, token: json.token, iframeUrl: `${IFRAME_BASE}/${json.token}` };
  }
  return { ok: false, error: json.reason || "PayTR ödeme başlatılamadı." };
}

export type PaytrCallbackParsed =
  | { ok: true; payload: PaymentCallbackPayload }
  | { ok: false; error: string };

/** PayTR Bildirim URL POST'unu doğrula (hash) ve sağlayıcıdan bağımsız payload üret. */
export function parsePaytrCallback(fd: FormData): PaytrCallbackParsed {
  const cfg = getPaytrConfig();
  if (!cfg.merchantKey || !cfg.merchantSalt) {
    return { ok: false, error: "config_missing" };
  }

  const merchantOid = String(fd.get("merchant_oid") ?? "").trim();
  const status = String(fd.get("status") ?? "").trim();
  const totalAmount = String(fd.get("total_amount") ?? "").trim();
  const hash = String(fd.get("hash") ?? "").trim();
  if (!merchantOid || !status || !hash) {
    return { ok: false, error: "missing_fields" };
  }

  const expected = createHmac("sha256", cfg.merchantKey)
    .update(merchantOid + cfg.merchantSalt + status + totalAmount)
    .digest("base64");
  if (expected !== hash) {
    return { ok: false, error: "bad_hash" };
  }

  const raw: Record<string, string> = {};
  for (const [k, v] of fd.entries()) raw[k] = typeof v === "string" ? v : "";

  return {
    ok: true,
    payload: {
      orderId: merchantOidToOrderId(merchantOid),
      reference: merchantOid,
      status: status === "success" ? "success" : "failed",
      provider: "paytr",
      callbackHash: hash,
      amount: totalAmount ? Number(totalAmount) / 100 : null,
      raw,
    },
  };
}

/** Checkout init: PayTR iframe sayfasına yönlendirme (token sayfada üretilir). */
export async function initializePaytrPayment(payload: PaymentInitPayload): Promise<PaymentInitResult> {
  let origin = "";
  try {
    origin = new URL(payload.successUrl).origin;
  } catch {
    origin = "";
  }
  if (!origin) {
    return { ok: false, error: "Geçersiz site adresi.", errorCode: "CONFIG_MISSING" };
  }
  if (!hasPaytrCredentials()) {
    return { ok: false, error: "PayTR yapılandırması eksik.", errorCode: "CONFIG_MISSING" };
  }
  return {
    ok: true,
    redirectUrl: `${origin}/odeme/paytr-baslat/${payload.orderId}`,
    reference: `paytr_${payload.orderId}`,
    raw: { provider: "paytr", testMode: paytrTestMode() },
  };
}
