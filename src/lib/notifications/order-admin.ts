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

function buildSubject(payload: OrderNotifyPayload): string {
  if (payload.event === "order_paid") {
    return `Yeni odendi siparis: ${payload.orderNumber}`;
  }
  return `Yeni siparis (havale): ${payload.orderNumber}`;
}

function buildPlainText(payload: OrderNotifyPayload): string {
  const title =
    payload.event === "order_paid"
      ? "Yeni odeme onaylandi"
      : "Yeni siparis olustu (havale/EFT bekleniyor)";
  const lines = payload.items.slice(0, 8).map((i) => `- ${i.name} x${i.quantity} (${toTry(i.totalPrice, payload.currency)})`);
  return [
    title,
    "",
    `Siparis No: ${payload.orderNumber}`,
    `Siparis ID: ${payload.orderId}`,
    `Musteri: ${payload.customerName}`,
    `E-posta: ${payload.customerEmail}`,
    `Telefon: ${payload.customerPhone}`,
    `Toplam: ${toTry(payload.total, payload.currency)}`,
    `Odeme Durumu: ${payload.paymentStatus}`,
    `Odeme Yontemi: ${payload.paymentProvider}`,
    "",
    "Urunler:",
    ...(lines.length > 0 ? lines : ["- (urun bilgisi yok)"]),
    ...(payload.adminOrderUrl ? ["", `Admin: ${payload.adminOrderUrl}`] : []),
  ].join("\n");
}

async function sendAdminEmail(payload: OrderNotifyPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = getAdminEmailRecipients();
  if (!apiKey || to.length === 0) return;

  const from = process.env.ADMIN_NOTIFY_FROM_EMAIL?.trim() || "Zelula <no-reply@zeluladesign.com>";
  const text = buildPlainText(payload);

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
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`email_notify_failed:${res.status}:${body}`);
  }
}

async function sendAdminWhatsApp(payload: OrderNotifyPayload): Promise<void> {
  const accessToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim();
  const recipients = getAdminWhatsAppRecipients();
  if (!accessToken || !phoneNumberId || recipients.length === 0) return;

  const text = buildPlainText(payload).slice(0, 3900);
  const templateName = process.env.WHATSAPP_CLOUD_TEMPLATE_NAME?.trim();
  const templateLang = process.env.WHATSAPP_CLOUD_TEMPLATE_LANG?.trim() || "tr";
  for (const to of recipients) {
    if (templateName) {
      const templateRes = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: templateLang },
          },
        }),
      });
      if (templateRes.ok) continue;
      const templateBody = await templateRes.text().catch(() => "");
      throw new Error(`whatsapp_template_notify_failed:${templateRes.status}:${templateBody}`);
    } else {
      const res = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`whatsapp_notify_failed:${res.status}:${body}`);
      }
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
