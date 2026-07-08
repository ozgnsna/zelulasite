/** Zelula serisi: Zelula301, Zelula359-Gümüş (yalnızca baştaki numara sayılır). */
export const ZELULA_SKU_NUMERIC_PATTERN = /^Zelula\s*(\d+)/i;

export function parseZelulaNumericId(value: string | null | undefined): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const match = raw.match(ZELULA_SKU_NUMERIC_PATTERN);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export function maxZelulaNumericFromValues(values: Iterable<string | null | undefined>): number {
  let max = 0;
  for (const value of values) {
    const n = parseZelulaNumericId(value);
    if (n != null && n > max) max = n;
  }
  return max;
}

export function formatZelulaSku(numericId: number): string {
  const n = Math.floor(numericId);
  if (!Number.isFinite(n) || n <= 0) return "Zelula1";
  return `Zelula${n}`;
}

export function suggestNextZelulaSku(effectiveMax: number): string {
  const base = Math.max(0, Math.floor(effectiveMax));
  return formatZelulaSku(base + 1);
}

export function collectZelulaIdentifiersFromOrderLines(
  lines: Array<{ barcode?: string | null; stockCode?: string | null }>,
): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const barcode = String(line.barcode ?? "").trim();
    const stockCode = String(line.stockCode ?? "").trim();
    if (barcode) out.push(barcode);
    if (stockCode) out.push(stockCode);
  }
  return out;
}
