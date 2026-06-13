import {
  getWhatsAppTemplateLanguage,
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
} from "@/lib/notifications/whatsapp-cloud";

type OrderNotifyItem = {
  name: string;
  quantity: number;
  totalPrice: number;
};

type OrderNotifyPayload = {
  event: "order_created_bank_transfer" | "order_paid";
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  currency: string;
  paymentStatus: string;
  paymentProvider: string;
  items: OrderNotifyItem[];
  adminOrderUrl?: string;
};

function splitCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function getAdminEmailRecipients(): string[] {
  const preferred = splitCsv(process.env.ADMIN_NOTIFY_EMAILS);
  if (preferred.length > 0) return preferred;
  return splitCsv(process.env.ADMIN_EMAILS);
}

function getEmailSkipReason(): string | undefined {
  if (!process.env.RESEND_API_KEY?.trim()) return "RESEND_API_KEY tanımlı değil";
  if (getAdminEmailRecipients().length === 0) {
    return "ADMIN_NOTIFY_EMAILS veya ADMIN_EMAILS boş";
  }
  return undefined;
}

function getWhatsAppSkipReason(): string | undefined {
  if (!process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim()) {
    return "WHATSAPP_CLOUD_ACCESS_TOKEN tanımlı değil";
  }
  if (!process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim()) {
    return "WHATSAPP_CLOUD_PHONE_NUMBER_ID tanımlı değil";
  }
  if (getAdminWhatsAppRecipients().length === 0) {
    return "ADMIN_NOTIFY_WHATSAPP_TO geçerli numara yok";
  }
  return undefined;
}

function getAdminWhatsAppRecipients(): string[] {
  const raw = splitCsv(process.env.ADMIN_NOTIFY_WHATSAPP_TO);
  const normalized = raw
    .map((v) => v.replace(/[^\d+]/g, "").trim())
    .map((v) => (v.startsWith("+") ? v.slice(1) : v))
    .map((v) => (v.startsWith("00") ? v.slice(2) : v))
    .filter((v) => /^\d{8,15}$/.test(v));
  return [...new Set(normalized)];
}

function toTry(value: number, currency: string): string {
  if (currency === "TRY") {
    return `${value.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₺`;
  }
  return `${value.toFixed(2)} ${currency}`;
}

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function providerLabel(provider: string): string {
  const p = (provider ?? "").toLowerCase();
  if (p === "paytr") return "Kart (PayTR)";
  if (p === "bank_transfer") return "Havale / EFT";
  if (p === "qnb_finansbank") return "Kart (QNB)";
  return provider || "—";
}

function statusLabel(status: string): { text: string; color: string; bg: string } {
  const s = (status ?? "").toLowerCase();
  if (s === "paid") return { text: "Ödendi", color: "#0f7b3f", bg: "#e7f5ec" };
  if (s === "failed") return { text: "Başarısız", color: "#b42318", bg: "#fdecea" };
  return { text: "Bekliyor", color: "#8a6d1b", bg: "#fdf6e3" };
}

function buildSubject(payload: OrderNotifyPayload): string {
  if (payload.event === "order_paid") {
    return `Yeni sipariş — ödeme onaylandı (${payload.orderNumber})`;
  }
  return `Yeni sipariş — havale/EFT bekleniyor (${payload.orderNumber})`;
}

function buildPlainText(payload: OrderNotifyPayload): string {
  const title =
    payload.event === "order_paid"
      ? "Yeni ödeme onaylandı"
      : "Yeni sipariş oluştu (havale/EFT bekleniyor)";
  const lines = payload.items
    .slice(0, 20)
    .map((i) => `- ${i.name} x${i.quantity} (${toTry(i.totalPrice, payload.currency)})`);
  return [
    title,
    "",
    `Sipariş No: ${payload.orderNumber}`,
    `Müşteri: ${payload.customerName}`,
    `E-posta: ${payload.customerEmail}`,
    `Telefon: ${payload.customerPhone}`,
    `Toplam: ${toTry(payload.total, payload.currency)}`,
    `Ödeme Durumu: ${statusLabel(payload.paymentStatus).text}`,
    `Ödeme Yöntemi: ${providerLabel(payload.paymentProvider)}`,
    "",
    "Ürünler:",
    ...(lines.length > 0 ? lines : ["- (ürün bilgisi yok)"]),
    ...(payload.adminOrderUrl ? ["", `Sipariş detayı: ${payload.adminOrderUrl}`] : []),
  ].join("\n");
}

function buildHtml(payload: OrderNotifyPayload): string {
  const isPaid = payload.event === "order_paid";
  const heading = isPaid ? "Ödeme onaylandı" : "Yeni sipariş";
  const subheading = isPaid
    ? "Yeni bir sipariş için ödeme başarıyla alındı."
    : "Yeni bir sipariş oluştu, havale/EFT bekleniyor.";
  const accent = "#8b5a2b";
  const status = statusLabel(payload.paymentStatus);

  const itemRows =
    payload.items.length > 0
      ? payload.items
          .slice(0, 20)
          .map(
            (i) => `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #efe9e0;color:#3a322a;font-size:14px;">
                ${escapeHtml(i.name)} <span style="color:#a89c8b;">× ${i.quantity}</span>
              </td>
              <td style="padding:10px 0;border-bottom:1px solid #efe9e0;color:#3a322a;font-size:14px;text-align:right;white-space:nowrap;">
                ${toTry(i.totalPrice, payload.currency)}
              </td>
            </tr>`,
          )
          .join("")
      : `<tr><td colspan="2" style="padding:10px 0;color:#a89c8b;font-size:14px;">Ürün bilgisi yok</td></tr>`;

  const infoRow = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 0;color:#8a7d6c;font-size:13px;width:130px;vertical-align:top;">${label}</td>
      <td style="padding:6px 0;color:#2d271f;font-size:14px;font-weight:500;">${value}</td>
    </tr>`;

  return `<!doctype html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ec;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece5da;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <tr>
          <td style="background:${accent};padding:22px 28px;">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:700;letter-spacing:.5px;">Zelula</p>
            <p style="margin:4px 0 0;color:#f3e7d5;font-size:13px;">${escapeHtml(heading)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 8px;">
            <p style="margin:0 0 4px;color:#2d271f;font-size:16px;font-weight:600;">${escapeHtml(heading)} · ${escapeHtml(payload.orderNumber)}</p>
            <p style="margin:0 0 16px;color:#7a6e5d;font-size:13px;">${escapeHtml(subheading)}</p>
            <span style="display:inline-block;background:${status.bg};color:${status.color};font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;">${status.text}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 28px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${infoRow("Müşteri", escapeHtml(payload.customerName))}
              ${infoRow("E-posta", escapeHtml(payload.customerEmail))}
              ${infoRow("Telefon", escapeHtml(payload.customerPhone))}
              ${infoRow("Ödeme", providerLabel(payload.paymentProvider))}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
              <tr>
                <td style="padding:14px 0 0;color:#2d271f;font-size:15px;font-weight:700;">Toplam</td>
                <td style="padding:14px 0 0;color:${accent};font-size:17px;font-weight:700;text-align:right;">${toTry(payload.total, payload.currency)}</td>
              </tr>
            </table>
          </td>
        </tr>
        ${
          payload.adminOrderUrl
            ? `<tr><td style="padding:24px 28px 28px;">
                 <a href="${escapeHtml(payload.adminOrderUrl)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:10px;">Siparişi görüntüle</a>
               </td></tr>`
            : `<tr><td style="padding:8px 28px 28px;"></td></tr>`
        }
      </table>
      <p style="margin:16px 0 0;color:#a89c8b;font-size:11px;">Bu e-posta Zelula sipariş bildirim sistemi tarafından otomatik gönderildi.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendAdminEmail(payload: OrderNotifyPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = getAdminEmailRecipients();
  if (!apiKey || to.length === 0) return;

  const from = process.env.ADMIN_NOTIFY_FROM_EMAIL?.trim() || "Zelula <no-reply@zeluladesign.com>";
  const text = buildPlainText(payload);
  const html = buildHtml(payload);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: buildSubject(payload),
      text,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`email_notify_failed:${res.status}:${body}`);
  }
}

async function sendAdminWhatsApp(payload: OrderNotifyPayload): Promise<void> {
  const recipients = getAdminWhatsAppRecipients();
  if (recipients.length === 0) return;

  const text = buildPlainText(payload).slice(0, 3900);
  const templateName = process.env.WHATSAPP_CLOUD_TEMPLATE_NAME?.trim();
  const templateLang = getWhatsAppTemplateLanguage();
  const bodyParameters = [
    payload.orderNumber,
    payload.customerName,
    toTry(payload.total, payload.currency),
  ];

  for (const to of recipients) {
    if (templateName) {
      await sendWhatsAppTemplateMessage({
        to,
        templateName,
        languageCode: templateLang,
        bodyParameters,
      });
    } else {
      await sendWhatsAppTextMessage({ to, body: text });
    }
  }
}

export async function notifyAdminOrderEvent(payload: OrderNotifyPayload): Promise<void> {
  const results = await Promise.allSettled([
    sendAdminEmail(payload),
    sendAdminWhatsApp(payload),
  ]);

  for (const r of results) {
    if (r.status === "rejected") {
      console.warn("[notify] admin order notify failed", r.reason);
    }
  }
}

export type AdminNotifyChannelResult = {
  attempted: boolean;
  ok: boolean;
  error?: string;
  /** Env eksikse neden gönderilmediği */
  skippedReason?: string;
};

export type AdminNotifyResult = {
  email: AdminNotifyChannelResult;
  whatsapp: AdminNotifyChannelResult;
};

export async function notifyAdminOrderEventWithResult(
  payload: OrderNotifyPayload,
): Promise<AdminNotifyResult> {
  const emailSkip = getEmailSkipReason();
  const whatsappSkip = getWhatsAppSkipReason();
  const emailAttempted = !emailSkip;
  const whatsappAttempted = !whatsappSkip;

  const [emailResult, whatsappResult] = await Promise.allSettled([
    emailAttempted ? sendAdminEmail(payload) : Promise.resolve(),
    whatsappAttempted ? sendAdminWhatsApp(payload) : Promise.resolve(),
  ]);

  const out: AdminNotifyResult = {
    email: {
      attempted: emailAttempted,
      ok: emailAttempted && emailResult.status === "fulfilled",
      skippedReason: emailSkip,
      error:
        emailAttempted && emailResult.status === "rejected"
          ? String(emailResult.reason ?? "email_failed")
          : undefined,
    },
    whatsapp: {
      attempted: whatsappAttempted,
      ok: whatsappAttempted && whatsappResult.status === "fulfilled",
      skippedReason: whatsappSkip,
      error:
        whatsappAttempted && whatsappResult.status === "rejected"
          ? String(whatsappResult.reason ?? "whatsapp_failed")
          : undefined,
    },
  };

  if (emailResult.status === "rejected") {
    console.warn("[notify] admin email notify failed", emailResult.reason);
  }
  if (whatsappResult.status === "rejected") {
    console.warn("[notify] admin whatsapp notify failed", whatsappResult.reason);
  }

  return out;
}
