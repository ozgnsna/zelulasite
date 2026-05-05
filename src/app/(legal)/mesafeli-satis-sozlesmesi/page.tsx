import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { LegalDocumentBody } from "@/components/legal/LegalDocumentBody";
import { getDistanceSalesContractText } from "@/lib/legal/legal-content";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi",
  description: "Zelula mesafeli satış sözleşmesi — 6502 sayılı Kanun kapsamı.",
};

export default function MesafeliSatisPage() {
  return (
    <LegalLayout title="Mesafeli Satış Sözleşmesi">
      <LegalDocumentBody text={getDistanceSalesContractText()} />
    </LegalLayout>
  );
}
