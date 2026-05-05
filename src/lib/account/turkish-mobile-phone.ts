/** Turkish GSM: 05XX XXX XX XX (11 digits, stored without spaces). */

const GSM_REGEX = /^05\d{9}$/;

export function normalizeTurkishMobileInput(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  // +90 5XX… → 05XX… (only when next digit is 5, typical GSM after country code)
  if (digits.startsWith("90") && digits.length > 2 && digits[2] === "5") {
    digits = `0${digits.slice(2)}`;
  }
  if (digits.length === 10 && digits.startsWith("5")) {
    digits = `0${digits}`;
  }
  return digits.slice(0, 11);
}

export function formatTurkishMobileDisplay(digits: string): string {
  const d = normalizeTurkishMobileInput(digits);
  if (d.length === 0) return "";
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  if (d.length <= 9) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
}

export function isValidTurkishMobileDigits(digits: string): boolean {
  return GSM_REGEX.test(normalizeTurkishMobileInput(digits));
}
