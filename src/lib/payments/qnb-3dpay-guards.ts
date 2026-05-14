/**
 * QNB 3DPay: sunucu → istemci taşıma ve gönderim öncesi doğrulama (sırlar loglanmaz).
 */

export const QNB_3DPAY_REQUIRED_HIDDEN_KEYS = [
  "MbrId",
  "MerchantID",
  "UserCode",
  "UserPass",
  "OrderId",
  "PurchAmount",
  "OkUrl",
  "FailUrl",
  "TxnType",
  "InstallmentCount",
  "Currency",
  "SecureType",
  "Rnd",
  "Hash",
] as const;

export type QnbSecureTypeName = "3DHost" | "3DPay";

export function sanitizeQnbHiddenFieldsRecord(input: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof k !== "string" || !k.trim()) continue;
    out[k] = v == null ? "" : String(v);
  }
  return out;
}

export function validateQnbGatewayPostUrl(
  url: string,
  opts?: { allowHttp?: boolean },
): { ok: true; url: string } | { ok: false; reason: string } {
  const t = (url ?? "").trim();
  if (!t) return { ok: false, reason: "empty" };
  try {
    const u = new URL(t);
    const allowHttp = Boolean(opts?.allowHttp);
    if (u.protocol !== "https:" && !(allowHttp && u.protocol === "http:")) {
      return { ok: false, reason: "protocol_not_allowed" };
    }
    if (!u.hostname) return { ok: false, reason: "no_host" };
    const h = u.hostname.toLowerCase();
    if (h === "vpos.qnb.com.tr" || h === "vpostest.qnb.com.tr") {
      const pl = u.pathname.toLowerCase();
      if (!pl.includes("/gateway/") || (!pl.endsWith("default.aspx") && !pl.endsWith("3dhost.aspx"))) {
        return { ok: false, reason: "qnb_vpos_requires_gateway_default_or_3dhost_aspx" };
      }
    }
    return { ok: true, url: t };
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
}

/** Özel QNB_GATEWAY_URL ile SecureType uyumsuzluğunu yakala (sık yapılandırma hatası). */
export function validateGatewayUrlMatchesSecureType(
  gatewayUrl: string,
  secureType: QnbSecureTypeName,
  hasCustomGatewayUrl: boolean,
): { ok: true } | { ok: false; reason: string } {
  if (!hasCustomGatewayUrl) return { ok: true };
  const lower = gatewayUrl.toLowerCase();
  if (secureType === "3DPay") {
    if (lower.includes("3dhost.aspx")) {
      return {
        ok: false,
        reason:
          "QNB_GATEWAY_URL 3DHost.aspx içeriyor; 3DPay için Default.aspx veya boş bırakın (otomatik seçim).",
      };
    }
  } else if (lower.includes("default.aspx")) {
    return {
      ok: false,
      reason:
        "QNB_GATEWAY_URL Default.aspx içeriyor; 3DHost için 3DHost.aspx veya boş bırakın (otomatik seçim).",
    };
  }
  return { ok: true };
}

export function validateQnb3DPayHiddenFields(
  fields: Record<string, string>,
): { ok: true } | { ok: false; missingKeys: string[] } {
  const missing: string[] = [];
  for (const key of QNB_3DPAY_REQUIRED_HIDDEN_KEYS) {
    const v = fields[key];
    if (v == null || String(v).trim() === "") missing.push(key);
  }
  return missing.length ? { ok: false, missingKeys: missing } : { ok: true };
}

export function serializeQnbHiddenFieldsJson(
  fields: Record<string, string>,
): { ok: true; json: string } | { ok: false; error: string } {
  try {
    return { ok: true, json: JSON.stringify(sanitizeQnbHiddenFieldsRecord(fields)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "json_stringify_failed" };
  }
}
