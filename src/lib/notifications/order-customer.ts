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
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.zeluladesign.com").replace(/\/$/, "");

/** Marka paleti — site ile uyumlu, e-posta istemcilerinde güvenli tonlar. */
const BRAND = {
  gold: "#8a734f",
  goldDark: "#6b5344",
  goldLight: "#c6a15b",
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
    ? `Siparişin alındı · ${input.orderNumber} · Zelula`
    : `Siparişin alındı · Havale bekleniyor · ${input.orderNumber}`;
}

function paidNextStepsHtml(): string {
  const steps = [
    { n: "1", label: "Sipariş alındı", active: true },
    { n: "2", label: "Hazırlanıyor", active: false },
    { n: "3", label: "Kargoda", active: false },
    { n: "4", label: "Teslim", active: false },
  ];
  const cells = steps
    .map(
      (s) => `
      <td align="center" style="padding:0 4px;vertical-align:top;width:25%;">
        <div style="width:28px;height:28px;line-height:28px;margin:0 auto 6px;border-radius:999px;font-size:11px;font-weight:700;text-align:center;${
          s.active
            ? `background:${BRAND.gold};color:#fff;`
            : `background:${BRAND.cream};color:${BRAND.muted};border:1px solid ${BRAND.border};`
        }">${s.n}</div>
        <p style="margin:0;font-size:10px;line-height:1.35;color:${s.active ? BRAND.text : BRAND.muted};font-weight:${s.active ? "600" : "500"};">${s.label}</p>
      </td>`,
    )
    .join("");
  return `
    <tr><td style="padding:20px 28px 0;">
      <div style="background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:14px;padding:16px 12px 14px;">
        <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.muted};">Sipariş yolculuğun</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
      </div>
    </td></tr>`;
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
  const heading = isPaid ? "Siparişin alındı" : "Siparişin kaydedildi";
  const intro = isPaid
    ? "Ödemen bize ulaştı. Seçimlerin özenle hazırlanmaya başlıyor; kargoya verildiğinde seni bilgilendireceğiz."
    : "Siparişini aldık. Havale veya EFT ödemen hesabımıza ulaştığında hazırlığa geçiyoruz.";
  const preheader = isPaid
    ? `${input.orderNumber} · ${toTry(input.total, input.currency)} · Teşekkür ederiz.`
    : `${input.orderNumber} · Havale bilgileri mailinde.`;

  const itemRows =
    input.items.length > 0
      ? input.items
          .slice(0, 30)
          .map(
            (i, idx) => `
            <tr>
              <td style="padding:${idx === 0 ? "0" : "12px"} 0 12px;border-bottom:1px solid ${BRAND.borderSoft};vertical-align:top;">
                <p style="margin:0 0 3px;color:${BRAND.text};font-size:14px;font-weight:600;line-height:1.45;">${escapeHtml(i.name)}</p>
                <p style="margin:0;color:${BRAND.muted};font-size:12px;">Adet: ${i.quantity}</p>
              </td>
              <td style="padding:${idx === 0 ? "0" : "12px"} 0 12px;border-bottom:1px solid ${BRAND.borderSoft};color:${BRAND.text};font-size:14px;font-weight:600;text-align:right;vertical-align:top;white-space:nowrap;">
                ${toTry(i.totalPrice, input.currency)}
              </td>
            </tr>`,
          )
          .join("")
      : `<tr><td colspan="2" style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Ürün bilgisi yok</td></tr>`;

  const bankBlock =
    input.kind === "bank_transfer" && input.bank
      ? `<tr><td style="padding:18px 28px 0;">
           <div style="background:${BRAND.paper};border:1px solid ${BRAND.border};border-radius:14px;padding:18px 20px;">
             <p style="margin:0 0 10px;color:${BRAND.text};font-size:13px;font-weight:700;letter-spacing:0.04em;">Havale / EFT bilgileri</p>
             <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:${BRAND.textSoft};">
               <tr><td style="padding:4px 0;color:${BRAND.muted};width:88px;">Banka</td><td style="padding:4px 0;font-weight:600;color:${BRAND.text};">${escapeHtml(input.bank.bankName)}</td></tr>
               <tr><td style="padding:4px 0;color:${BRAND.muted};">Alıcı</td><td style="padding:4px 0;font-weight:600;color:${BRAND.text};">${escapeHtml(input.bank.accountHolder)}</td></tr>
               <tr><td style="padding:4px 0;color:${BRAND.muted};">IBAN</td><td style="padding:4px 0;font-weight:700;letter-spacing:0.4px;color:${BRAND.text};">${escapeHtml(input.bank.ibanDisplay)}</td></tr>
               <tr><td style="padding:4px 0;color:${BRAND.muted};">Tutar</td><td style="padding:4px 0;font-weight:700;color:${BRAND.gold};">${toTry(input.total, input.currency)}</td></tr>
               <tr><td style="padding:4px 0;color:${BRAND.muted};">Açıklama</td><td style="padding:4px 0;font-weight:700;color:${BRAND.text};">${escapeHtml(input.orderNumber)}</td></tr>
             </table>
             <p style="margin:12px 0 0;color:${BRAND.muted};font-size:12px;line-height:1.5;">Açıklama alanına sipariş numaranı yazmayı unutma.</p>
           </div>
         </td></tr>`
      : "";

  const orderUrl = input.orderUrl?.trim() || `${SITE_URL}/hesabim`;

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(heading)}</title>
  <!--[if mso]><style type="text/css">body,table,td{font-family:Georgia,serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:${BRAND.paper};border-radius:20px;overflow:hidden;border:1px solid ${BRAND.border};box-shadow:0 12px 40px -20px rgba(45,37,33,0.18);font-family:Georgia,'Times New Roman',Times,serif;">
        <tr>
          <td style="background:linear-gradient(145deg,${BRAND.goldDark} 0%,${BRAND.gold} 48%,${BRAND.goldLight} 100%);padding:32px 28px 28px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:26px;font-weight:400;letter-spacing:0.22em;text-transform:uppercase;">Zelula</p>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.88);font-size:12px;font-style:italic;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Takı değil, bir his.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <p style="margin:0 0 8px;color:${BRAND.gold};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Teşekkürler</p>
            <p style="margin:0 0 10px;color:${BRAND.text};font-size:22px;font-weight:700;line-height:1.25;font-family:Georgia,'Times New Roman',Times,serif;">${escapeHtml(heading)}</p>
            <p style="margin:0 0 6px;color:${BRAND.text};font-size:15px;font-weight:600;">Merhaba ${escapeHtml(firstName(input.customerName))},</p>
            <p style="margin:0;color:${BRAND.textSoft};font-size:14px;line-height:1.65;">${escapeHtml(intro)}</p>
          </td>
        </tr>
        ${isPaid ? paidNextStepsHtml() : ""}
        <tr>
          <td style="padding:22px 28px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <div style="background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:14px;padding:16px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:${BRAND.muted};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Sipariş no</td>
                  <td style="color:${BRAND.text};font-size:15px;font-weight:700;text-align:right;font-family:ui-monospace,Consolas,monospace;">${escapeHtml(input.orderNumber)}</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <p style="margin:0 0 10px;color:${BRAND.muted};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Seçimlerin</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
              <tr>
                <td style="padding:16px 0 0;color:${BRAND.text};font-size:15px;font-weight:700;">Toplam</td>
                <td style="padding:16px 0 0;color:${BRAND.gold};font-size:20px;font-weight:700;text-align:right;font-family:Georgia,'Times New Roman',Times,serif;">${toTry(input.total, input.currency)}</td>
              </tr>
            </table>
          </td>
        </tr>
        ${
          input.shippingAddress
            ? `<tr><td style="padding:18px 28px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                 <div style="border-left:3px solid ${BRAND.goldLight};padding:2px 0 2px 14px;">
                   <p style="margin:0 0 6px;color:${BRAND.muted};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Teslimat adresi</p>
                   <p style="margin:0;color:${BRAND.textSoft};font-size:14px;line-height:1.55;">${escapeHtml(input.shippingAddress)}</p>
                 </div>
               </td></tr>`
            : ""
        }
        ${bankBlock}
        <tr>
          <td align="center" style="padding:26px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <a href="${escapeHtml(orderUrl)}" style="display:inline-block;min-width:220px;background:${BRAND.gold};color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:999px;text-align:center;box-shadow:0 8px 24px -8px rgba(107,83,68,0.45);">Siparişini görüntüle</a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <p style="margin:0;text-align:center;color:${BRAND.muted};font-size:12px;line-height:1.5;">Soruların için yanınızdayız.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 24px;border-top:1px solid ${BRAND.borderSoft};background:${BRAND.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:10px;">
                  <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.gold};text-decoration:none;font-size:13px;font-weight:600;">${SUPPORT_EMAIL}</a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom:10px;">
                  <span style="color:${BRAND.textSoft};font-size:13px;">${getSupportPhoneDisplay()}</span>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="${INSTAGRAM_URL}" style="color:${BRAND.gold};text-decoration:none;font-size:13px;font-weight:600;">@zelulaofficial</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:18px 0 0;color:${BRAND.muted};font-size:11px;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">© ${new Date().getFullYear()} Zelula · Bu e-posta siparişinle ilgili otomatik gönderildi.</p>
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
