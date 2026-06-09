import { getSupportPhoneDisplay } from "@/lib/support-contact";

/**
 * Müşteriye gönderilen sipariş onay e-postası (markalı HTML).
 * - kind "paid": kart ödemesi onaylandı.
 * - kind "bank_transfer": sipariş alındı, havale/EFT bekleniyor (banka bilgileri eklenir).
 */

type CustomerItem = { name: string; quantity: number; totalPrice: number };

export type CustomerOrderEmailInput = {
  kind: "paid" | "bank_transfer";
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  currency: string;
  items: CustomerItem[];
  shippingAddress?: string | null;
  bank?: { bankName: string; accountHolder: string; ibanDisplay: string } | null;
  orderUrl?: string | null;
};

export type CustomerEmailResult = {
  attempted: boolean;
  ok: boolean;
  error?: string;
  skippedReason?: string;
};

const SUPPORT_EMAIL = "destek@zeluladesign.com";
const INSTAGRAM_URL = "https://www.instagram.com/zelulaofficial";
const ACCENT = "#8b5a2b";

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function firstName(full: string): string {
  const f = String(full ?? "").trim().split(/\s+/)[0];
  return f || "değerli müşterimiz";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? "").trim());
}

function buildSubject(input: CustomerOrderEmailInput): string {
  return input.kind === "paid"
    ? `Siparişin alındı — Zelula (${input.orderNumber})`
    : `Siparişin alındı, havale bekleniyor — Zelula (${input.orderNumber})`;
}

function buildText(input: CustomerOrderEmailInput): string {
  const intro =
    input.kind === "paid"
      ? "Ödemen alındı, siparişin hazırlanıyor."
      : "Siparişin alındı. Havale/EFT ödemen bize ulaşınca hazırlığa başlıyoruz.";
  const lines = input.items
    .slice(0, 30)
    .map((i) => `- ${i.name} x${i.quantity} (${toTry(i.totalPrice, input.currency)})`);
  const bankLines =
    input.kind === "bank_transfer" && input.bank
      ? [
          "",
          "Havale/EFT bilgileri:",
          `Banka: ${input.bank.bankName}`,
          `Alıcı: ${input.bank.accountHolder}`,
          `IBAN: ${input.bank.ibanDisplay}`,
          `Tutar: ${toTry(input.total, input.currency)}`,
          `Açıklama: ${input.orderNumber}`,
        ]
      : [];
  return [
    `Merhaba ${firstName(input.customerName)},`,
    "",
    intro,
    "",
    `Sipariş No: ${input.orderNumber}`,
    `Toplam: ${toTry(input.total, input.currency)}`,
    ...(input.shippingAddress ? [`Teslimat: ${input.shippingAddress}`] : []),
    "",
    "Ürünler:",
    ...(lines.length > 0 ? lines : ["- (ürün bilgisi yok)"]),
    ...bankLines,
    "",
    `Sorularınız için: ${SUPPORT_EMAIL} · ${getSupportPhoneDisplay()}`,
    "Zelula",
  ].join("\n");
}

function buildHtml(input: CustomerOrderEmailInput): string {
  const isPaid = input.kind === "paid";
  const heading = isPaid ? "Siparişin alındı 🎉" : "Siparişin alındı";
  const intro = isPaid
    ? "Ödemen başarıyla alındı ve siparişin hazırlanmaya başlıyor. Kargoya verildiğinde seni bilgilendireceğiz."
    : "Siparişini aldık. Havale/EFT ödemen bize ulaşınca siparişini hazırlamaya başlayacağız.";

  const itemRows =
    input.items.length > 0
      ? input.items
          .slice(0, 30)
          .map(
            (i) => `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #efe9e0;color:#3a322a;font-size:14px;">
                ${escapeHtml(i.name)} <span style="color:#a89c8b;">× ${i.quantity}</span>
              </td>
              <td style="padding:10px 0;border-bottom:1px solid #efe9e0;color:#3a322a;font-size:14px;text-align:right;white-space:nowrap;">
                ${toTry(i.totalPrice, input.currency)}
              </td>
            </tr>`,
          )
          .join("")
      : `<tr><td colspan="2" style="padding:10px 0;color:#a89c8b;font-size:14px;">Ürün bilgisi yok</td></tr>`;

  const bankBlock =
    input.kind === "bank_transfer" && input.bank
      ? `<tr><td style="padding:8px 28px 0;">
           <div style="background:#fbf7f0;border:1px solid #ece0cc;border-radius:12px;padding:16px 18px;">
             <p style="margin:0 0 8px;color:#2d271f;font-size:14px;font-weight:700;">Havale / EFT bilgileri</p>
             <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#3a322a;">
               <tr><td style="padding:3px 0;color:#8a7d6c;width:90px;">Banka</td><td style="padding:3px 0;font-weight:500;">${escapeHtml(input.bank.bankName)}</td></tr>
               <tr><td style="padding:3px 0;color:#8a7d6c;">Alıcı</td><td style="padding:3px 0;font-weight:500;">${escapeHtml(input.bank.accountHolder)}</td></tr>
               <tr><td style="padding:3px 0;color:#8a7d6c;">IBAN</td><td style="padding:3px 0;font-weight:600;letter-spacing:.5px;">${escapeHtml(input.bank.ibanDisplay)}</td></tr>
               <tr><td style="padding:3px 0;color:#8a7d6c;">Tutar</td><td style="padding:3px 0;font-weight:600;color:${ACCENT};">${toTry(input.total, input.currency)}</td></tr>
               <tr><td style="padding:3px 0;color:#8a7d6c;">Açıklama</td><td style="padding:3px 0;font-weight:600;">${escapeHtml(input.orderNumber)}</td></tr>
             </table>
             <p style="margin:10px 0 0;color:#7a6e5d;font-size:12px;">Açıklama kısmına sipariş numaranı yazmayı unutma.</p>
           </div>
         </td></tr>`
      : "";

  return `<!doctype html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ec;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece5da;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <tr>
          <td style="background:${ACCENT};padding:24px 28px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:1px;">Zelula</p>
            <p style="margin:4px 0 0;color:#f3e7d5;font-size:12px;font-style:italic;">Takı değil, bir his.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 28px 6px;">
            <p style="margin:0 0 6px;color:#2d271f;font-size:17px;font-weight:700;">${escapeHtml(heading)}</p>
            <p style="margin:0 0 4px;color:#3a322a;font-size:14px;">Merhaba ${escapeHtml(firstName(input.customerName))},</p>
            <p style="margin:0;color:#7a6e5d;font-size:13px;line-height:1.6;">${escapeHtml(intro)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#8a7d6c;font-size:13px;">Sipariş No</td>
                <td style="color:#2d271f;font-size:14px;font-weight:600;text-align:right;">${escapeHtml(input.orderNumber)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 28px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
              <tr>
                <td style="padding:14px 0 0;color:#2d271f;font-size:15px;font-weight:700;">Toplam</td>
                <td style="padding:14px 0 0;color:${ACCENT};font-size:17px;font-weight:700;text-align:right;">${toTry(input.total, input.currency)}</td>
              </tr>
            </table>
          </td>
        </tr>
        ${
          input.shippingAddress
            ? `<tr><td style="padding:16px 28px 0;">
                 <p style="margin:0 0 4px;color:#8a7d6c;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Teslimat adresi</p>
                 <p style="margin:0;color:#3a322a;font-size:13px;line-height:1.5;">${escapeHtml(input.shippingAddress)}</p>
               </td></tr>`
            : ""
        }
        ${bankBlock}
        ${
          input.orderUrl
            ? `<tr><td style="padding:22px 28px 4px;">
                 <a href="${escapeHtml(input.orderUrl)}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:10px;">Siparişini görüntüle</a>
               </td></tr>`
            : ""
        }
        <tr>
          <td style="padding:24px 28px 28px;border-top:1px solid #f0ebe2;margin-top:12px;">
            <p style="margin:18px 0 4px;color:#7a6e5d;font-size:12px;">Sorularınız için bize ulaşın:</p>
            <p style="margin:0;color:#3a322a;font-size:13px;">
              <a href="mailto:${SUPPORT_EMAIL}" style="color:${ACCENT};text-decoration:none;">${SUPPORT_EMAIL}</a>
              &nbsp;·&nbsp; ${getSupportPhoneDisplay()}
              &nbsp;·&nbsp; <a href="${INSTAGRAM_URL}" style="color:${ACCENT};text-decoration:none;">@zelulaofficial</a>
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;color:#a89c8b;font-size:11px;">© 2026 Zelula · Bu e-posta siparişinizle ilgili otomatik gönderildi.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendCustomerOrderEmail(
  input: CustomerOrderEmailInput,
): Promise<CustomerEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { attempted: false, ok: false, skippedReason: "RESEND_API_KEY tanımlı değil" };
  }
  if (!isValidEmail(input.customerEmail)) {
    return { attempted: false, ok: false, skippedReason: "Geçersiz müşteri e-postası" };
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
        subject: buildSubject(input),
        text: buildText(input),
        html: buildHtml(input),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { attempted: true, ok: false, error: `customer_email_failed:${res.status}:${body}` };
    }
    return { attempted: true, ok: true };
  } catch (e) {
    return { attempted: true, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
