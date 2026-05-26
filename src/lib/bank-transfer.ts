/** Havale / EFT — sunucu env (Vercel Production). */

export type BankTransferDetails = {
  bankName: string;
  accountHolder: string;
  /** Görüntüleme: TR12 3456 … */
  ibanDisplay: string;
  /** Kopyalama: boşluksuz */
  ibanCompact: string;
  configured: boolean;
};

function normalizeIban(raw: string): string {
  return raw.replace(/\s/g, "").toUpperCase();
}

/** TR IBAN — 4’lü gruplar. */
export function formatIbanDisplay(compact: string): string {
  const c = normalizeIban(compact);
  if (!c) return "";
  if (c.length <= 4) return c;
  const parts: string[] = [];
  for (let i = 0; i < c.length; i += 4) {
    parts.push(c.slice(i, i + 4));
  }
  return parts.join(" ");
}

function isPlaceholderIban(compact: string): boolean {
  if (!compact) return true;
  if (compact === "TR000000000000000000000000") return true;
  return /^TR0+$/.test(compact);
}

export function getBankTransferDetails(): BankTransferDetails {
  const bankName = process.env.BANK_TRANSFER_BANK_NAME?.trim() || "QNB Finansbank";
  const accountHolder = process.env.BANK_TRANSFER_ACCOUNT_HOLDER?.trim() || "Zelula";
  const ibanCompact = normalizeIban(process.env.BANK_TRANSFER_IBAN?.trim() ?? "");
  const configured =
    ibanCompact.length >= 26 && ibanCompact.startsWith("TR") && !isPlaceholderIban(ibanCompact);

  return {
    bankName,
    accountHolder,
    ibanCompact,
    ibanDisplay: configured ? formatIbanDisplay(ibanCompact) : "",
    configured,
  };
}
