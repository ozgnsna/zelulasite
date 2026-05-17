import { formatTry } from "@/lib/money";

export type GiftCardDeliveryPayload = {
  recipientEmail: string;
  recipientName?: string | null;
  code: string;
  amountTry: number;
  currency?: string;
  senderName: string;
  personalMessage?: string | null;
  expiresAt: Date | string;
};

export type GiftCardDeliveryResult = {
  attempted: boolean;
  ok: boolean;
  error?: string;
};

function getFromAddress(): string {
  return (
    process.env.GIFT_CARD_NOTIFY_FROM_EMAIL?.trim() ||
    process.env.ADMIN_NOTIFY_FROM_EMAIL?.trim() ||
    "Zelula <no-reply@zeluladesign.com>"
  );
}

function formatGiftCardCodeForEmail(code: string): string {
  const normalized = code.replace(/[\s-]+/g, "").toUpperCase();
  const chunks = normalized.match(/.{1,4}/g);
  return chunks?.join("-") ?? normalized;
}

function formatExpiryTr(expiresAt: Date | string): string {
  const d = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  if (Number.isNaN(d.getTime())) return "Belirtilmedi";
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildSubject(amountTry: number): string {
  return `Zelula hediye kartınız — ${formatTry(amountTry)}`;
}

function buildPlainText(payload: GiftCardDeliveryPayload): string {
  const codeDisplay = formatGiftCardCodeForEmail(payload.code);
  const amountLabel = formatTry(payload.amountTry);
  const expiryLabel = formatExpiryTr(payload.expiresAt);
  const greeting = payload.recipientName?.trim()
    ? `Merhaba ${payload.recipientName.trim()},`
    : "Merhaba,";

  const messageBlock = payload.personalMessage?.trim()
    ? [
        "",
        `${payload.senderName.trim() || "Bir Zelula müşterisi"} size bir not bıraktı:`,
        "",
        `“${payload.personalMessage.trim()}”`,
        "",
      ]
    : ["", `${payload.senderName.trim() || "Bir Zelula müşterisi"} size bir Zelula hediye kartı gönderdi.`, ""];

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "") || "https://zeluladesign.com";

  return [
    greeting,
    "",
    "Size özel dijital hediye kartınız hazır.",
    "",
    `Tutar: ${amountLabel}`,
    `Hediye kartı kodu: ${codeDisplay}`,
    `Son kullanma tarihi: ${expiryLabel}`,
    ...messageBlock,
    "Kodu sepet sayfasında girerek kullanabilirsiniz; bakiye kısmi olarak da harcanabilir.",
    "",
    `Alışveriş: ${siteUrl}`,
    "",
    "Bu e-postayı siz talep etmediyseniz lütfen destek@zeluladesign.com adresine yazın.",
    "",
    "Sevgilerle,",
    "Zelula",
  ].join("\n");
}

async function sendGiftCardEmail(payload: GiftCardDeliveryPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = payload.recipientEmail.trim().toLowerCase();
  if (!apiKey || !to) return;

  const from = getFromAddress();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: buildSubject(payload.amountTry),
      text: buildPlainText(payload),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`gift_card_email_failed:${res.status}:${body}`);
  }
}

/** Alıcıya hediye kartı kodunu e-posta ile gönderir. */
export async function notifyGiftCardRecipient(payload: GiftCardDeliveryPayload): Promise<void> {
  try {
    await sendGiftCardEmail(payload);
  } catch (err) {
    console.warn("[notify] gift card delivery email failed", err);
  }
}

export async function notifyGiftCardRecipientWithResult(
  payload: GiftCardDeliveryPayload,
): Promise<GiftCardDeliveryResult> {
  const attempted = Boolean(process.env.RESEND_API_KEY?.trim()) && Boolean(payload.recipientEmail?.trim());

  if (!attempted) {
    return { attempted: false, ok: false, error: "resend_or_recipient_missing" };
  }

  try {
    await sendGiftCardEmail(payload);
    return { attempted: true, ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.warn("[notify] gift card delivery email failed", err);
    return { attempted: true, ok: false, error };
  }
}
