import { getSupportPhoneDisplay } from "@/lib/support-contact";
import { ZELULA_PUAN_PER_APPROVED_REVIEW } from "@/lib/loyalty/review-reward";
import { getPublicSiteUrl } from "@/lib/account/site-url";

export type ReviewReminderProduct = {
  name: string;
  slug: string;
};

export type ReviewReminderEmailInput = {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  products: ReviewReminderProduct[];
};

export type ReviewReminderEmailResult = {
  attempted: boolean;
  ok: boolean;
  error?: string;
  skippedReason?: string;
};

const SUPPORT_EMAIL = "destek@zeluladesign.com";
const INSTAGRAM_URL = "https://www.instagram.com/zelulaofficial";

const BRAND = {
  gold: "#8a734f",
  goldDark: "#6b5344",
  cream: "#faf8f5",
  paper: "#fffdfb",
  border: "#e8dfd3",
  borderSoft: "#f0ebe2",
  text: "#2d271f",
  textSoft: "#5c5348",
  muted: "#8a7d6c",
} as const;

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstName(full: string): string {
  const f = String(full ?? "").trim().split(/\s+/)[0];
  return f || "değerli müşterimiz";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? "").trim());
}

function productReviewUrl(slug: string): string {
  const base = getPublicSiteUrl().replace(/\/$/, "");
  return `${base}/urunler/${encodeURIComponent(slug)}?yorum=1#yorumlar`;
}

export function buildReviewReminderSubject(orderNumber: string): string {
  return `Siparişin hakkında kısa bir not · ${orderNumber} · Zelula`;
}

/** Düz metin şablon (rapor + Resend text). */
export function buildReviewReminderText(input: ReviewReminderEmailInput): string {
  const lines = input.products.map((p) => `- ${p.name}: ${productReviewUrl(p.slug)}`);
  return [
    `Merhaba ${firstName(input.customerName)},`,
    "",
    `Siparişin (${input.orderNumber}) sana ulaştı. Deneyimini kısaca paylaşmak istersen ürün sayfasından yorum bırakabilirsin.`,
    "",
    `Yorumun onaylandığında ${ZELULA_PUAN_PER_APPROVED_REVIEW} Zelula Puan kazanırsın.`,
    "",
    "Ürünler:",
    ...lines,
    "",
    `Soruların için: ${SUPPORT_EMAIL} · ${getSupportPhoneDisplay()}`,
    "",
    "Bu bir hizmet e-postasıdır (siparişinle ilgili). Bu tür bildirimleri istemiyorsan bize yazman yeterli:",
    SUPPORT_EMAIL,
    "",
    "Zelula",
  ].join("\n");
}

export function buildReviewReminderHtml(input: ReviewReminderEmailInput): string {
  const name = escapeHtml(firstName(input.customerName));
  const orderNo = escapeHtml(input.orderNumber);
  const productRows = input.products
    .map((p) => {
      const href = escapeHtml(productReviewUrl(p.slug));
      const label = escapeHtml(p.name);
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${BRAND.borderSoft};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <p style="margin:0 0 6px;color:${BRAND.text};font-size:14px;font-weight:600;">${label}</p>
            <a href="${href}" style="display:inline-block;color:${BRAND.gold};font-size:13px;font-weight:600;text-decoration:none;">Yorum yaz →</a>
          </td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Yorum hatırlatma</title></head>
<body style="margin:0;padding:0;background:${BRAND.cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};">
    <tr><td align="center" style="padding:28px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.paper};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:28px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.muted};">Zelula</p>
            <h1 style="margin:12px 0 0;font-size:22px;line-height:1.35;font-weight:600;color:${BRAND.text};">Merhaba ${name},</h1>
            <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:${BRAND.textSoft};">
              Siparişin (<strong style="color:${BRAND.text};">${orderNo}</strong>) sana ulaştı. Deneyimini kısaca paylaşmak istersen ürün sayfasından yorum bırakabilirsin.
            </p>
            <p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:${BRAND.textSoft};">
              Yorumun onaylandığında <strong style="color:${BRAND.text};">${ZELULA_PUAN_PER_APPROVED_REVIEW} Zelula Puan</strong> kazanırsın.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <p style="margin:12px 0 4px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.muted};">Siparişindeki ürünler</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${productRows}</table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 24px;border-top:1px solid ${BRAND.borderSoft};background:${BRAND.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <p style="margin:0 0 10px;text-align:center;">
              <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.gold};text-decoration:none;font-size:13px;font-weight:600;">${SUPPORT_EMAIL}</a>
            </p>
            <p style="margin:0 0 10px;text-align:center;color:${BRAND.textSoft};font-size:13px;">${escapeHtml(getSupportPhoneDisplay())}</p>
            <p style="margin:0 0 10px;text-align:center;">
              <a href="${INSTAGRAM_URL}" style="color:${BRAND.gold};text-decoration:none;font-size:13px;font-weight:600;">@zelulaofficial</a>
            </p>
            <p style="margin:12px 0 0;text-align:center;color:${BRAND.muted};font-size:11px;line-height:1.5;">
              Bu bir hizmet e-postasıdır (siparişinle ilgili). Bu tür bildirimleri istemiyorsan
              <a href="mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Yorum hatırlatma e-postası")}" style="color:${BRAND.gold};">bize yazman yeterli</a>.
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:18px 0 0;color:${BRAND.muted};font-size:11px;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">© ${new Date().getFullYear()} Zelula · Siparişinle ilgili otomatik gönderildi.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendReviewReminderEmail(
  input: ReviewReminderEmailInput,
): Promise<ReviewReminderEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { attempted: false, ok: false, skippedReason: "RESEND_API_KEY tanımlı değil" };
  }
  if (!isValidEmail(input.customerEmail)) {
    return { attempted: false, ok: false, skippedReason: "Geçersiz müşteri e-postası" };
  }
  if (input.products.length === 0) {
    return { attempted: false, ok: false, skippedReason: "Yorumlanacak ürün yok" };
  }

  const from = process.env.ADMIN_NOTIFY_FROM_EMAIL?.trim() || "Zelula <no-reply@zeluladesign.com>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.customerEmail.trim()],
        subject: buildReviewReminderSubject(input.orderNumber),
        text: buildReviewReminderText(input),
        html: buildReviewReminderHtml(input),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { attempted: true, ok: false, error: `review_reminder_failed:${res.status}:${body}` };
    }
    return { attempted: true, ok: true };
  } catch (e) {
    return { attempted: true, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
