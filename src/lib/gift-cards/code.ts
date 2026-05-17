import { createHash, randomUUID } from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** 16 karakter, büyük harf + rakam; UUID entropisinden türetilir. */
export function generateGiftCardCode(): string {
  const hex = (randomUUID() + randomUUID()).replace(/-/g, "");
  let out = "";
  for (let i = 0; i < 16; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    out += CODE_ALPHABET[byte % CODE_ALPHABET.length]!;
  }
  return out;
}

export function normalizeGiftCardCodeInput(raw: string): string {
  return raw.replace(/[\s-]+/g, "").toUpperCase();
}

export function hashGiftCardCode(code: string): string {
  const normalized = normalizeGiftCardCodeInput(code);
  const pepper =
    process.env.GIFT_CARD_CODE_PEPPER?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "zelula-gift-card-dev-pepper";
  return createHash("sha256").update(`${pepper}:${normalized}`).digest("hex");
}

export function giftCardCodeLast4(code: string): string {
  const n = normalizeGiftCardCodeInput(code);
  return n.slice(-4);
}
