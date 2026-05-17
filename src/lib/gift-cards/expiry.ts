/** Varsayılan hediye kartı geçerlilik süresi (ay). */
export function getDefaultGiftCardExpiresAt(from: Date = new Date()): Date {
  const raw = Number(process.env.GIFT_CARD_EXPIRY_MONTHS ?? 12);
  const months = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 12;
  const expires = new Date(from);
  expires.setMonth(expires.getMonth() + months);
  return expires;
}
