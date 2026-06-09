import { initializePaytrPayment } from "@/lib/payments/paytr";
import type { PaymentInitPayload, PaymentInitResult } from "@/lib/payments/types";

/** Kart ödemesi: PayTR iFrame API. (QNB kodu korunur ama devre dışı.) */
export async function initializePayment(payload: PaymentInitPayload): Promise<PaymentInitResult> {
  return initializePaytrPayment(payload);
}
