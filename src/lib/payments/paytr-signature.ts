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
