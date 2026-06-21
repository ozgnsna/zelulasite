import { createHash, randomUUID } from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Tüm ortamlarda aynı olmalı; Vercel'de GIFT_CARD_CODE_PEPPER ile override edilebilir. */
export const GIFT_CARD_PEPPER_DEFAULT = "zelula-gift-card-v1";
const LEGACY_DEV_PEPPER = "zelula-gift-card-dev-pepper";

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

function hashNormalizedWithPepper(normalized: string, pepper: string): string {
  return createHash("sha256").update(`${pepper}:${normalized}`).digest("hex");
}

/** Yeni kart üretiminde kullanılan birincil pepper. */
export function getGiftCardCodePepper(): string {
  return process.env.GIFT_CARD_CODE_PEPPER?.trim() || GIFT_CARD_PEPPER_DEFAULT;
}

export function hashGiftCardCode(code: string): string {
  return hashNormalizedWithPepper(normalizeGiftCardCodeInput(code), getGiftCardCodePepper());
}

/**
 * Doğrulama sırasında denenecek hash adayları.
 * Eski manuel kartlar farklı pepper ile üretilmiş olabilir.
 */
export function giftCardCodeLookupHashes(rawCode: string): string[] {
  const normalized = normalizeGiftCardCodeInput(rawCode);
  const peppers = new Set<string>();
  const explicit = process.env.GIFT_CARD_CODE_PEPPER?.trim();
  if (explicit) peppers.add(explicit);
  peppers.add(GIFT_CARD_PEPPER_DEFAULT);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceKey) peppers.add(serviceKey);
  peppers.add(LEGACY_DEV_PEPPER);
  return [...peppers].map((pepper) => hashNormalizedWithPepper(normalized, pepper));
}

export function giftCardCodeLast4(code: string): string {
  const n = normalizeGiftCardCodeInput(code);
  return n.slice(-4);
}
