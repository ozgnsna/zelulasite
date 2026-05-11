export type PaymentInitPayload = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: "TRY";
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  successUrl: string;
  failUrl: string;
  callbackUrl: string;
  /** İsteğe bağlı: istemci IP (X-Forwarded-For ilk adresi vb.) */
  clientIp?: string | null;
  /** İsteğe bağlı: teslimat özeti (max ~400 karakter) */
  shippingAddressLine?: string | null;
};

export type PaymentErrorCode =
  | "PROVIDER_UNSUPPORTED"
  | "CONFIG_MISSING"
  | "INIT_FAILED"
  | "CALLBACK_INVALID"
  | "CALLBACK_SIGNATURE_INVALID"
  | "CALLBACK_DUPLICATE"
  | "CALLBACK_ORDER_NOT_FOUND"
  | "ORDER_ALREADY_PAID";

export type PaymentInitResult = {
  ok: boolean;
  redirectUrl?: string;
  reference?: string;
  error?: string;
  errorCode?: PaymentErrorCode;
  raw?: unknown;
};

export type PaymentCallbackPayload = {
  orderId: string;
  reference?: string;
  status: "success" | "failed";
  provider: string;
  callbackHash: string;
  amount: number | null;
  raw: Record<string, string>;
};

export type PaymentCallbackResult = {
  ok: boolean;
  payload?: PaymentCallbackPayload;
  error?: string;
  errorCode?: PaymentErrorCode;
};
