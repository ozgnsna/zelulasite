export type PasswordStrengthLabel = "Zayıf" | "Orta" | "Güçlü";

export type PasswordStrengthResult = {
  met: number;
  label: PasswordStrengthLabel;
  /** 0–100 for progress bar */
  percent: number;
};

function countCriteria(pw: string): number {
  let n = 0;
  if (pw.length >= 8) n++;
  if (/[\p{Ll}]/u.test(pw)) n++;
  if (/[\p{Lu}]/u.test(pw)) n++;
  if (/\p{N}/u.test(pw)) n++;
  if (/[^\p{L}\p{N}\s]/u.test(pw)) n++;
  return n;
}

export function getPasswordStrength(pw: string): PasswordStrengthResult {
  const met = countCriteria(pw);
  let label: PasswordStrengthLabel;
  if (met <= 2) label = "Zayıf";
  else if (met === 3) label = "Orta";
  else label = "Güçlü";
  return { met, label, percent: (met / 5) * 100 };
}

/** Softer copy for the lowest tier; scoring still uses internal "Zayıf". */
export function getPasswordStrengthDisplayLabel(label: PasswordStrengthLabel): string {
  if (label === "Zayıf") return "Geliştirilebilir";
  return label;
}
