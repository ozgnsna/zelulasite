/** Normalize for storage / comparison: no whitespace, lowercase. */
export function normalizeEmailInput(raw: string): string {
  return raw.replace(/\s+/g, "").toLowerCase();
}

/**
 * Basic format only — not a provider whitelist.
 * Custom domains (e.g. destek@zeluladesign.com) pass when they have @, a dotted domain, and no spaces.
 */
export function isBasicValidEmail(s: string): boolean {
  const e = normalizeEmailInput(s);
  if (!e) return false;
  const i = e.indexOf("@");
  if (i <= 0) return false;
  const local = e.slice(0, i);
  const domain = e.slice(i + 1);
  if (!local || !domain) return false;
  if (!domain.includes(".")) return false;
  const afterLastDot = domain.slice(domain.lastIndexOf(".") + 1);
  if (afterLastDot.length < 1) return false;
  return true;
}

/**
 * Well-known consumer domains — reference only.
 * Not used to validate or reject addresses; suggestions use the explicit typo map only.
 */
export const COMMON_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com"] as const;

/**
 * Known misspellings of big providers → correct domain.
 * Suggest-only; custom/business domains are never matched here unless explicitly listed.
 */
const PROVIDER_DOMAIN_TYPOS: Record<string, string> = {
  "gmil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gnail.com": "gmail.com",
  "hotnail.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "iclod.com": "icloud.com",
};

export type EmailSmartSuggestion = {
  full: string;
  suggestedDomain: string;
};

/**
 * Suggest a fix only when the domain exactly matches a known provider typo entry.
 * No fuzzy matching — avoids suggesting gmail.com for legitimate business domains.
 */
export function getEmailSmartSuggestion(normalized: string): EmailSmartSuggestion | null {
  const n = normalizeEmailInput(normalized);
  const i = n.lastIndexOf("@");
  if (i <= 0) return null;
  const local = n.slice(0, i);
  const domain = n.slice(i + 1);
  if (!local || !domain) return null;

  const mapped = PROVIDER_DOMAIN_TYPOS[domain];
  if (!mapped || mapped === domain) return null;

  return { full: `${local}@${mapped}`, suggestedDomain: mapped };
}
