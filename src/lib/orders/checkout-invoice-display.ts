export type OrderCheckoutInvoiceType = "individual" | "sole" | "company";

export type OrderCheckoutInvoiceField = { label: string; value: string };

export function parseOrderCheckoutInvoiceType(raw: unknown): OrderCheckoutInvoiceType {
  const s = String(raw ?? "individual").trim().toLowerCase();
  if (s === "sole" || s === "company") return s;
  return "individual";
}

export function checkoutInvoiceTypeLabelTr(type: OrderCheckoutInvoiceType): string {
  switch (type) {
    case "sole":
      return "Şahıs Şirketi";
    case "company":
      return "Şirket";
    default:
      return "Bireysel";
  }
}

export function getOrderCheckoutInvoiceFields(order: {
  invoice_type?: unknown;
  invoice_full_name?: unknown;
  invoice_tc_identity_no?: unknown;
  invoice_company_name?: unknown;
  invoice_tax_no?: unknown;
  invoice_tax_office?: unknown;
}): OrderCheckoutInvoiceField[] {
  const type = parseOrderCheckoutInvoiceType(order.invoice_type);
  const rows: OrderCheckoutInvoiceField[] = [
    { label: "Fatura tipi", value: checkoutInvoiceTypeLabelTr(type) },
  ];

  const fullName = String(order.invoice_full_name ?? "").trim();
  const tc = String(order.invoice_tc_identity_no ?? "").trim();
  const companyName = String(order.invoice_company_name ?? "").trim();
  const taxNo = String(order.invoice_tax_no ?? "").trim();
  const taxOffice = String(order.invoice_tax_office ?? "").trim();

  if (type === "company") {
    rows.push({ label: "Şirket ünvanı", value: companyName || "—" });
    rows.push({ label: "VKN", value: taxNo || "—" });
    rows.push({ label: "Vergi dairesi", value: taxOffice || "—" });
    return rows;
  }

  if (type === "sole") {
    rows.push({ label: "Ad soyad", value: fullName || "—" });
    rows.push({ label: "TCKN", value: tc || "—" });
    rows.push({ label: "Vergi dairesi", value: taxOffice || "—" });
    return rows;
  }

  if (fullName) rows.push({ label: "Ad soyad", value: fullName });
  if (tc && tc !== "11111111111") rows.push({ label: "TCKN", value: tc });

  return rows;
}
