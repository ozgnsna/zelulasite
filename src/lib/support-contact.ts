const DEFAULT_SUPPORT_WHATSAPP_NUMBER = "905533710024";

function normalizeDigits(value: string | undefined | null): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function getSupportWhatsAppNumber(): string {
  const fromEnv = normalizeDigits(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER);
  return fromEnv || DEFAULT_SUPPORT_WHATSAPP_NUMBER;
}

export function getSupportWhatsAppHref(message: string): string {
  return `https://wa.me/${getSupportWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
}

export function getSupportPhoneDisplay(): string {
  const digits = getSupportWhatsAppNumber();
  if (digits.startsWith("90") && digits.length === 12) {
    const local = digits.slice(2);
    return `+90 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
  }
  return digits;
}
