/** Default WhatsApp body when sharing a Zelula link (emotional, soft). */
export function referralWhatsAppShareBody(referralLink: string) {
  return `Buna bayıldım 😍\nSen de bak: ${referralLink}`;
}

/** Default SMS body when sharing a Zelula link. */
export function referralSmsShareBody(referralLink: string) {
  return `Şuna bakmak isteyebilirsin ✨\n${referralLink}`;
}

export const ZELULA_ATC_SHARE_EVENT = "zelula:atc-share";

export type AtcShareEventDetail = { productSlug: string | null };

export function dispatchAtcShareMoment(productSlug: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AtcShareEventDetail>(ZELULA_ATC_SHARE_EVENT, { detail: { productSlug } }),
  );
}
