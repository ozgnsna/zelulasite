import { initializeQnbPayment } from "@/lib/payments/qnb-finansbank";
import type { PaymentInitPayload, PaymentInitResult } from "@/lib/payments/types";

/** Kart ödemesi: QNB Finansbank vPOS (3DPay veya 3DHost; varsayılan 3DPay). */
export async function initializePayment(payload: PaymentInitPayload): Promise<PaymentInitResult> {
  return initializeQnbPayment(payload);
}
