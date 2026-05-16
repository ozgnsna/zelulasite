export type QnbCardBrand = "visa" | "mastercard" | "troy" | null;

export function detectQnbCardBrand(digits: string): QnbCardBrand {
  if (!digits) return null;
  if (digits.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]\d{2}/.test(digits)) return "mastercard";
  if (digits.startsWith("9792") || digits.startsWith("65")) return "troy";
  return null;
}

/** Önizleme: girilen haneler + boş slotlar için • (loglanmaz, yalnızca UI). */
export function formatPreviewPanLine(digits: string, visibleSlots = 16): string {
  const parts: string[] = [];
  for (let i = 0; i < visibleSlots; i += 4) {
    let chunk = "";
    for (let j = 0; j < 4; j++) {
      const idx = i + j;
      chunk += idx < digits.length ? digits[idx]! : "•";
    }
    parts.push(chunk);
  }
  return parts.join(" ");
}

export function formatPreviewExpiry(digits: string): string {
  const d = digits.slice(0, 4);
  if (!d) return "MM/YY";
  if (d.length === 1) return `${d}M/YY`;
  if (d.length === 2) return `${d}/YY`;
  if (d.length === 3) return `${d.slice(0, 2)}/${d[2]}Y`;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export function formatPreviewCvvMask(length: number): string {
  const n = Math.min(Math.max(length, 0), 4);
  return n === 0 ? "•••" : "•".repeat(n);
}
