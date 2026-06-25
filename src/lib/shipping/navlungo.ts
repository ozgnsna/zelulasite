import { randomBytes } from "node:crypto";
import { formatTrPhoneForNavlungo, parseShippingAddress } from "@/lib/shipping/address";
import type { CreateShipmentResult, OrderShippingSource } from "@/lib/shipping/types";

type TokenCache = { token: string; expiresAtMs: number };
let tokenCache: TokenCache | null = null;

function useMock(): boolean {
  const v = String(process.env.NAVLUNGO_USE_MOCK ?? "false").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function apiBaseUrl(): string {
  const raw = process.env.NAVLUNGO_API_BASE_URL?.trim();
  if (raw) return raw.endsWith("/") ? raw : `${raw}/`;
  return "https://domestic-api.navlungo.com/v2.1/";
}

function intEnv(name: string, fallback: number): number {
  const n = Number.parseInt(String(process.env[name] ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function floatEnv(name: string, fallback: number): number {
  const n = Number.parseFloat(String(process.env[name] ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function extractApiError(body: unknown): string {
  if (!body || typeof body !== "object") return "Navlungo isteği başarısız.";
  const o = body as Record<string, unknown>;
  if (typeof o.error === "string" && o.error.trim()) return o.error.trim();
  if (o.error && typeof o.error === "object") {
    const parts = Object.values(o.error as Record<string, unknown>)
      .flatMap((v) => (Array.isArray(v) ? v.map(String) : [String(v)]))
      .filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
  return "Navlungo isteği başarısız.";
}

async function fetchNavlungoToken(): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const username = process.env.NAVLUNGO_API_USERNAME?.trim();
  const password = process.env.NAVLUNGO_API_PASSWORD?.trim();
  if (!username || !password) {
    return { ok: false, error: "Navlungo API kullanıcı adı veya şifre tanımlı değil." };
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs > now + 60_000) {
    return { ok: true, token: tokenCache.token };
  }

  const res = await fetch(`${apiBaseUrl()}auth/api`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !body?.status) {
    return { ok: false, error: extractApiError(body) };
  }

  const data = body.data as Record<string, unknown> | undefined;
  const accessToken = String(data?.access_token ?? "").trim();
  if (!accessToken) {
    return { ok: false, error: "Navlungo oturum yanıtında token bulunamadı." };
  }

  const expiresRaw = String(data?.expires_in ?? "").trim();
  const expiresAtMs = expiresRaw ? Date.parse(expiresRaw.replace(" ", "T")) : now + 7 * 60 * 60 * 1000;
  tokenCache = {
    token: accessToken,
    expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : now + 7 * 60 * 60 * 1000,
  };
  return { ok: true, token: accessToken };
}

type NavlungoCreatePostResponse = {
  post_number?: string;
  reference_id?: string;
  tracking_url?: string;
  barcode_url?: string;
};

function pickCreatePostResult(body: unknown): NavlungoCreatePostResponse | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (typeof o.post_number === "string") return o as NavlungoCreatePostResponse;
  const data = o.data;
  if (Array.isArray(data) && data[0] && typeof data[0] === "object") {
    return data[0] as NavlungoCreatePostResponse;
  }
  if (data && typeof data === "object" && typeof (data as Record<string, unknown>).post_number === "string") {
    return data as NavlungoCreatePostResponse;
  }
  return null;
}

/**
 * Navlungo Domestic v2.1 gönderi oluşturma.
 * @see https://domestic-docs.navlungo.com/tr/v2-1
 */
export async function createNavlungoShipment(order: OrderShippingSource): Promise<CreateShipmentResult> {
  if (useMock()) {
    const suffix = randomBytes(5).toString("hex").toUpperCase();
    return {
      ok: true,
      provider: "navlungo",
      trackingNumber: `NVL-MOCK-${suffix}`,
      labelUrl: `https://example.invalid/navlungo/labels/mock/${order.id}.pdf`,
      shippingStatus: "created",
    };
  }

  const addr = parseShippingAddress(order.shipping_address_json);
  if (!addr) {
    return { ok: false, code: "INVALID_ADDRESS", error: "Sipariş teslimat adresi eksik veya geçersiz." };
  }

  const senderAddressId = intEnv("NAVLUNGO_SENDER_ADDRESS_ID", 0);
  if (!senderAddressId) {
    return {
      ok: false,
      code: "NAVLUNGO_NOT_CONFIGURED",
      error: "NAVLUNGO_SENDER_ADDRESS_ID tanımlı değil. Panelden gönderici adres ID'sini ekleyin.",
    };
  }

  const auth = await fetchNavlungoToken();
  if (!auth.ok) {
    return { ok: false, code: "NAVLUNGO_NOT_CONFIGURED", error: auth.error };
  }

  const payload = {
    platform: "zeluladesign",
    posts: [
      {
        reference_id: order.order_number,
        carrier_id: intEnv("NAVLUNGO_CARRIER_ID", 1),
        post_type: intEnv("NAVLUNGO_POST_TYPE", 2),
        cod_payment_type: "",
        sender: { addressId: senderAddressId },
        recipient: {
          name: order.customer_name.trim() || "Alıcı",
          phone: formatTrPhoneForNavlungo(order.phone),
          email: order.email.trim() || undefined,
          address: addr.address_line,
          country: "tr",
          city: addr.city,
          district: addr.district,
          post_code: addr.postal_code || "",
        },
        post: {
          desi: floatEnv("NAVLUNGO_DEFAULT_DESI", 1),
          package_count: 1,
          price: "",
          note: addr.delivery_note ?? "",
        },
        barcode_format: process.env.NAVLUNGO_BARCODE_FORMAT?.trim() || "pdf-A5",
        custom_data_1: order.id,
        custom_data_2: order.order_number,
        custom_data_3: "",
        custom_data_4: "",
      },
    ],
  };

  const res = await fetch(`${apiBaseUrl()}post/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${auth.token}`,
      "X-localization": "tr",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) tokenCache = null;
    return { ok: false, code: "NAVLUNGO_API_ERROR", error: extractApiError(body) };
  }

  const created = pickCreatePostResult(body);
  const trackingNumber = String(created?.post_number ?? "").trim();
  if (!trackingNumber) {
    return { ok: false, code: "NAVLUNGO_API_ERROR", error: "Navlungo gönderi numarası alınamadı." };
  }

  const trackingUrl = String(created?.tracking_url ?? "").trim();
  const barcodeUrl = String(created?.barcode_url ?? "").trim();

  return {
    ok: true,
    provider: "navlungo",
    trackingNumber,
    labelUrl: trackingUrl || barcodeUrl || null,
    shippingStatus: "created",
  };
}
