import crypto from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function createPaytrTokenSignature(input: string, merchantKey: string): string {
  return crypto.createHmac("sha256", merchantKey).update(input).digest("base64");
}

/**
 * PayTR iFrame API 1. adım — resmi örnekteki token (HMAC-SHA256, çıktı base64).
 * hash_str = merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket
 *   + no_installment + max_installment + currency + test_mode
 * paytr_token = base64( HMAC_SHA256( merchant_key, hash_str + merchant_salt ) )
 */
export function buildPaytrIframeStep1Token(params: {
  merchantId: string;
  userIp: string;
  merchantOid: string;
  email: string;
  paymentAmountKurus: number;
  userBasketBase64: string;
  noInstallment: string;
  maxInstallment: string;
  currency: string;
  testMode: string;
  merchantSalt: string;
  merchantKey: string;
}): string {
  const hashStr =
    params.merchantId +
    params.userIp +
    params.merchantOid +
    params.email +
    String(params.paymentAmountKurus) +
    params.userBasketBase64 +
    params.noInstallment +
    params.maxInstallment +
    params.currency +
    params.testMode;
  return createPaytrTokenSignature(hashStr + params.merchantSalt, params.merchantKey);
}

/**
 * PAYTR callback hash doğrulama formatı merchant entegrasyonuna göre değişebilir.
 * Bu fonksiyon bilinen formatları destekler:
 * 1) merchant_oid + merchant_salt + status + total_amount
 * 2) merchant_oid + merchant_salt + status + payment_amount
 */
export function verifyPaytrCallbackSignature(params: {
  merchantOid: string;
  status: string;
  totalAmount?: string;
  paymentAmount?: string;
  callbackHash: string;
  merchantKey: string;
  merchantSalt: string;
}): boolean {
  const { merchantOid, status, totalAmount, paymentAmount, callbackHash, merchantKey, merchantSalt } =
    params;
  if (!merchantOid || !status || !callbackHash) return false;

  const candidates = [
    `${merchantOid}${merchantSalt}${status}${totalAmount ?? ""}`,
    `${merchantOid}${merchantSalt}${status}${paymentAmount ?? ""}`,
  ];

  return candidates.some((candidate) => {
    const expected = createPaytrTokenSignature(candidate, merchantKey);
    return safeEqual(callbackHash, expected);
  });
}
