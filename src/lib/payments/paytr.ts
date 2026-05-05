import type {
  PaymentCallbackResult,
  PaymentInitPayload,
  PaymentInitResult,
} from "@/lib/payments/types";
import {
  buildPaytrIframeStep1Token,
  verifyPaytrCallbackSignature,
} from "@/lib/payments/paytr-signature";
import { logPayment } from "@/lib/payments/logger";
import { z } from "zod";

const PAYTR_API_URL = process.env.PAYTR_API_URL ?? "https://www.paytr.com/odeme/api/get-token";
const PAYTR_USE_MOCK = (process.env.PAYTR_USE_MOCK ?? "true") === "true";
const PAYTR_TEST_MODE = process.env.PAYTR_TEST_MODE ?? "1";
const callbackSchema = z.object({
  merchant_oid: z.string().min(1),
  status: z.enum(["success", "failed"]),
  hash: z.string().min(1),
  total_amount: z.string().optional(),
  payment_amount: z.string().optional(),
  payment_type: z.string().optional(),
  failed_reason_code: z.string().optional(),
});

function getPaytrEnv() {
  return {
    merchantId: process.env.PAYTR_MERCHANT_ID ?? "",
    merchantKey: process.env.PAYTR_MERCHANT_KEY ?? "",
    merchantSalt: process.env.PAYTR_MERCHANT_SALT ?? "",
  };
}

export async function initializePaytrPayment(
  payload: PaymentInitPayload,
): Promise<PaymentInitResult> {
  if (PAYTR_USE_MOCK) {
    return {
      ok: true,
      redirectUrl: `${payload.successUrl}`,
      reference: `paytr_mock_${payload.orderId}`,
      raw: { mode: "mock" },
    };
  }

  const { merchantId, merchantKey, merchantSalt } = getPaytrEnv();

  if (!merchantId || !merchantKey || !merchantSalt) {
    logPayment("error", "PayTR config missing during init.");
    return {
      ok: false,
      error: "PAYTR ortam değişkenleri eksik.",
      errorCode: "CONFIG_MISSING",
    };
  }

  const userIp = String(payload.clientIp ?? "127.0.0.1")
    .trim()
    .slice(0, 39);
  const merchantOid = payload.orderId;
  const userBasket = Buffer.from(
    JSON.stringify([[payload.orderNumber, payload.amount.toFixed(2), 1]]),
  ).toString("base64");
  const amountAsKurus = Math.round(payload.amount * 100);
  const noInstallment = "0";
  const maxInstallment = "0";
  const currency = payload.currency === "TRY" ? "TL" : payload.currency;
  const testMode = PAYTR_TEST_MODE === "0" ? "0" : "1";

  const paytrToken = buildPaytrIframeStep1Token({
    merchantId,
    userIp,
    merchantOid,
    email: payload.customer.email,
    paymentAmountKurus: amountAsKurus,
    userBasketBase64: userBasket,
    noInstallment,
    maxInstallment,
    currency,
    testMode,
    merchantSalt,
    merchantKey,
  });

  const userAddress = (payload.shippingAddressLine ?? "").trim() || "Teslimat adresi";

  const body = new URLSearchParams({
    merchant_id: merchantId,
    user_ip: userIp,
    merchant_oid: merchantOid,
    email: payload.customer.email,
    payment_amount: String(amountAsKurus),
    user_basket: userBasket,
    paytr_token: paytrToken,
    user_name: payload.customer.name.trim().slice(0, 60),
    user_address: userAddress.slice(0, 400),
    user_phone: payload.customer.phone.replace(/\s/g, "").slice(0, 20),
    merchant_ok_url: payload.successUrl,
    merchant_fail_url: payload.failUrl,
    callback_url: payload.callbackUrl,
    no_installment: noInstallment,
    max_installment: maxInstallment,
    currency,
    test_mode: testMode,
    debug_on: process.env.NODE_ENV === "development" ? "1" : "0",
    timeout_limit: "30",
    lang: "tr",
  });

  const res = await fetch(PAYTR_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json().catch(() => null)) as
    | { status?: string; token?: string; reason?: string }
    | null;
  if (!res.ok || !data || data.status !== "success" || !data.token) {
    logPayment("error", "PayTR token init failed.", { status: res.status, data });
    return {
      ok: false,
      error: data?.reason ?? "PAYTR token alınamadı.",
      errorCode: "INIT_FAILED",
      raw: data,
    };
  }

  return {
    ok: true,
    redirectUrl: `https://www.paytr.com/odeme/guvenli/${data.token}`,
    reference: data.token,
    raw: data,
  };
}

export async function parsePaytrCallback(formData: FormData): Promise<PaymentCallbackResult> {
  const { merchantKey, merchantSalt } = getPaytrEnv();
  const raw = Object.fromEntries(
    Array.from(formData.entries()).map(([k, v]) => [k, String(v)]),
  );

  const parsedFields = callbackSchema.safeParse(raw);
  if (!parsedFields.success) {
    logPayment("warn", "PayTR callback schema validation failed.", parsedFields.error.flatten());
    return { ok: false, error: "Callback alanları geçersiz.", errorCode: "CALLBACK_INVALID" };
  }

  const fields = parsedFields.data;
  const orderId = fields.merchant_oid;
  const statusRaw = fields.status;
  const status = statusRaw === "success" ? "success" : "failed";
  const reference = fields.payment_type ?? fields.failed_reason_code ?? undefined;
  const callbackHash = fields.hash;
  const amountRaw = fields.total_amount ?? fields.payment_amount ?? "";
  const amount = amountRaw ? Number(amountRaw) / 100 : null;

  if (!merchantKey || !merchantSalt) {
    logPayment("error", "PayTR callback env missing.");
    return {
      ok: false,
      error: "PAYTR callback doğrulama env eksik.",
      errorCode: "CONFIG_MISSING",
    };
  }

  if (PAYTR_USE_MOCK) {
    return {
      ok: true,
      payload: { orderId, status, provider: "paytr", reference, callbackHash: callbackHash || `mock_${orderId}`, amount, raw },
    };
  }

  const signatureValid = verifyPaytrCallbackSignature({
    merchantOid: orderId,
    status: statusRaw,
    totalAmount: raw.total_amount,
    paymentAmount: fields.payment_amount,
    callbackHash,
    merchantKey,
    merchantSalt,
  });
  if (!signatureValid) {
    logPayment("warn", "PayTR callback signature invalid.", {
      orderId,
      status: statusRaw,
      callbackHashPresent: Boolean(callbackHash),
    });
    return {
      ok: false,
      error: "PAYTR callback imzası doğrulanamadı.",
      errorCode: "CALLBACK_SIGNATURE_INVALID",
    };
  }

  return {
    ok: true,
    payload: { orderId, status, provider: "paytr", reference, callbackHash, amount, raw },
  };
}
