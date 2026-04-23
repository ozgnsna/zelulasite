import { initializePaytrPayment, parsePaytrCallback } from "@/lib/payments/paytr";
import type {
  PaymentCallbackResult,
  PaymentInitPayload,
  PaymentInitResult,
} from "@/lib/payments/types";
import { logPayment } from "@/lib/payments/logger";

export async function initializePayment(payload: PaymentInitPayload): Promise<PaymentInitResult> {
  const provider = process.env.PAYMENT_PROVIDER ?? "paytr";

  switch (provider) {
    case "paytr":
      return initializePaytrPayment(payload);
    default:
      logPayment("error", "Unsupported payment provider on init.", { provider });
      return {
        ok: false,
        error: `Desteklenmeyen ödeme sağlayıcısı: ${provider}`,
        errorCode: "PROVIDER_UNSUPPORTED",
      };
  }
}

export async function parsePaymentCallback(formData: FormData): Promise<PaymentCallbackResult> {
  const provider = process.env.PAYMENT_PROVIDER ?? "paytr";

  switch (provider) {
    case "paytr":
      return parsePaytrCallback(formData);
    default:
      logPayment("error", "Unsupported payment provider on callback.", { provider });
      return {
        ok: false,
        error: `Desteklenmeyen ödeme sağlayıcısı: ${provider}`,
        errorCode: "PROVIDER_UNSUPPORTED",
      };
  }
}
