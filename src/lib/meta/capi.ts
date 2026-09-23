import { createHash } from "node:crypto";
import { isAdminEmail } from "@/lib/admin/auth";
import { normalizeTurkishMobileInput } from "@/lib/account/turkish-mobile-phone";
import { getSiteOrigin } from "@/lib/seo/site";
import { metaPurchaseEventId } from "@/lib/meta/event-ids";

const CAPI_TIMEOUT_MS = 5000;

export type MetaPurchaseCapiInput = {
  orderNumber: string;
  email?: string | null;
  phone?: string | null;
  total: number;
  currency?: string | null;
  contentIds?: string[];
  marketingConsent: boolean;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  eventSourceUrl?: string | null;
};

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmailForMeta(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Meta: E.164 rakamları, + yok. TR 05XX… → 905XX… */
function normalizePhoneForMeta(raw: string): string {
  const local = normalizeTurkishMobileInput(raw);
  if (/^05\d{9}$/.test(local)) return `90${local.slice(1)}`;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) return digits;
  return digits;
}

function graphVersion(): string {
  return process.env.META_GRAPH_API_VERSION?.trim() || "v21.0";
}

function capiConfig(): { pixelId: string; token: string; testCode: string } | null {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim() ?? "";
  if (!pixelId || !token) return null;
  return {
    pixelId,
    token,
    testCode: process.env.META_CAPI_TEST_EVENT_CODE?.trim() ?? "",
  };
}

/**
 * Purchase CAPI. Env yok / admin alıcı / hata → sessiz no-op.
 * Ödeme akışını bloklamaz; 5 sn timeout, hata yutulur.
 */
export async function sendMetaPurchaseCapi(input: MetaPurchaseCapiInput): Promise<void> {
  try {
    const config = capiConfig();
    if (!config) return;
    if (isAdminEmail(input.email)) return;

    const orderNumber = String(input.orderNumber ?? "").trim();
    if (!orderNumber) return;

    const userData: Record<string, string> = {};
    if (input.marketingConsent) {
      const email = normalizeEmailForMeta(String(input.email ?? ""));
      const phone = normalizePhoneForMeta(String(input.phone ?? ""));
      if (email.includes("@")) userData.em = sha256Hex(email);
      if (phone.length >= 10) userData.ph = sha256Hex(phone);
      const ip = String(input.clientIp ?? "").trim();
      const ua = String(input.clientUserAgent ?? "").trim();
      if (ip) userData.client_ip_address = ip;
      if (ua) userData.client_user_agent = ua;
    }

    const origin = getSiteOrigin();
    const eventSourceUrl =
      String(input.eventSourceUrl ?? "").trim() || `${origin}/odeme/basarili`;
    const contentIds = (input.contentIds ?? []).map((id) => String(id).trim()).filter(Boolean);
    const currency = String(input.currency ?? "TRY").trim() || "TRY";

    const event: Record<string, unknown> = {
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: metaPurchaseEventId(orderNumber),
      action_source: "website",
      event_source_url: eventSourceUrl,
      custom_data: {
        currency,
        value: Number(input.total) || 0,
        content_type: "product",
        ...(contentIds.length > 0 ? { content_ids: contentIds } : {}),
      },
    };
    if (Object.keys(userData).length > 0) {
      event.user_data = userData;
    }

    const body: Record<string, unknown> = {
      data: [event],
      access_token: config.token,
    };
    if (config.testCode) {
      body.test_event_code = config.testCode;
    }

    const url = `https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(config.pixelId)}/events`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CAPI_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn("[meta-capi] Purchase rejected", {
          status: res.status,
          orderNumber,
          body: text.slice(0, 300),
        });
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.warn("[meta-capi] Purchase failed", {
      orderNumber: input.orderNumber,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}
