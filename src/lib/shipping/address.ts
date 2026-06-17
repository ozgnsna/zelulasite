export type ParsedShippingAddress = {
  address_line: string;
  city: string;
  district: string;
  postal_code: string;
  delivery_note: string | null;
};

export function parseShippingAddress(raw: unknown): ParsedShippingAddress | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const address_line = String(o.address_line ?? "").trim();
  const city = String(o.city ?? "").trim();
  const district = String(o.district ?? "").trim();
  if (!address_line || !city || !district) return null;
  return {
    address_line,
    city,
    district,
    postal_code: String(o.postal_code ?? "").trim(),
    delivery_note: o.delivery_note == null ? null : String(o.delivery_note).trim() || null,
  };
}

/** Navlungo: +90 532 123 45 67 */
export function formatTrPhoneForNavlungo(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("90") && local.length >= 12) local = local.slice(2);
  else if (local.startsWith("0") && local.length >= 11) local = local.slice(1);
  if (local.length !== 10) return phone.trim() || "+90 500 000 00 00";
  return `+90 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
}
