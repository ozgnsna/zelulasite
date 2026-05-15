type Level = "info" | "warn" | "error";

/** Geçici ödeme akışı teşhisi: `QNB_PAY_FLOW_DEBUG=1` veya geliştirme ortamı. */
export function isPaymentFlowDebugEnabled(): boolean {
  const raw = process.env.QNB_PAY_FLOW_DEBUG?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  return process.env.NODE_ENV === "development";
}

/** Müşteriye gösterilen QNB debug panelleri — canlıda kapalı (sunucu logları ayrı). */
export function isQnbCustomerFacingDebugVisible(): boolean {
  const vercelEnv = process.env.VERCEL_ENV ?? "";
  if (vercelEnv === "production") return false;
  if (process.env.NODE_ENV === "production" && vercelEnv !== "preview") return false;
  return isPaymentFlowDebugEnabled();
}

/** Sunucu: checkout yanıtı / redirectUrl teşhisi (`CHECKOUT_HANDOFF_DEBUG=1` veya ödeme debug). */
export function isCheckoutHandoffDebugEnabled(): boolean {
  const raw = process.env.CHECKOUT_HANDOFF_DEBUG?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  return isPaymentFlowDebugEnabled();
}

export function logPayment(level: Level, message: string, meta?: unknown) {
  const line = `[payments] ${message}`;
  if (level === "error") console.error(line, meta ?? "");
  else if (level === "warn") console.warn(line, meta ?? "");
  else console.info(line, meta ?? "");
}
