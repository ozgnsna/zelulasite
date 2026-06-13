/** Meta WhatsApp Cloud API — admin + müşteri şablon mesajları. */

export type WhatsAppTemplateButtonParam = {
  index: number;
  text: string;
};

export function normalizeWhatsAppPhone(raw: string): string | null {
  let v = String(raw ?? "")
    .replace(/[^\d+]/g, "")
    .trim();
  if (v.startsWith("+")) v = v.slice(1);
  if (v.startsWith("00")) v = v.slice(2);
  if (v.startsWith("0") && v.length === 11) v = `90${v.slice(1)}`;
  if (v.length === 10 && v.startsWith("5")) v = `90${v}`;
  if (!/^\d{8,15}$/.test(v)) return null;
  return v;
}

export function getWhatsAppCloudConfig(): { accessToken: string; phoneNumberId: string } | null {
  const accessToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return null;
  return { accessToken, phoneNumberId };
}

export function getWhatsAppTemplateLanguage(): string {
  return process.env.WHATSAPP_CLOUD_TEMPLATE_LANG?.trim() || "tr";
}

export async function sendWhatsAppTemplateMessage(opts: {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters?: string[];
  buttonParameters?: WhatsAppTemplateButtonParam[];
}): Promise<void> {
  const config = getWhatsAppCloudConfig();
  if (!config) throw new Error("whatsapp_not_configured");

  const to = normalizeWhatsAppPhone(opts.to);
  if (!to) throw new Error("whatsapp_invalid_recipient");

  const components: Record<string, unknown>[] = [];
  if (opts.bodyParameters?.length) {
    components.push({
      type: "body",
      parameters: opts.bodyParameters.map((text) => ({ type: "text", text: String(text) })),
    });
  }
  for (const btn of opts.buttonParameters ?? []) {
    components.push({
      type: "button",
      sub_type: "url",
      index: String(btn.index),
      parameters: [{ type: "text", text: String(btn.text) }],
    });
  }

  const template: Record<string, unknown> = {
    name: opts.templateName,
    language: { code: opts.languageCode ?? getWhatsAppTemplateLanguage() },
  };
  if (components.length > 0) template.components = components;

  const res = await fetch(`https://graph.facebook.com/v22.0/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`whatsapp_template_failed:${res.status}:${body}`);
  }
}

export async function sendWhatsAppTextMessage(opts: { to: string; body: string }): Promise<void> {
  const config = getWhatsAppCloudConfig();
  if (!config) throw new Error("whatsapp_not_configured");

  const to = normalizeWhatsAppPhone(opts.to);
  if (!to) throw new Error("whatsapp_invalid_recipient");

  const res = await fetch(`https://graph.facebook.com/v22.0/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: opts.body.slice(0, 3900) },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`whatsapp_text_failed:${res.status}:${body}`);
  }
}
