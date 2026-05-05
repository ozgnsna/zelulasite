import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { LegalDocumentBody } from "@/components/legal/LegalDocumentBody";
import { getPreContractInfoText } from "@/lib/legal/legal-content";

export const metadata: Metadata = {
  title: "Ön Bilgilendirme Formu",
  description: "Zelula ön bilgilendirme formu — mesafeli satış öncesi bilgilendirme.",
};

export default function OnBilgilendirmePage() {
  return (
    <LegalLayout title="Ön Bilgilendirme Formu">
      <LegalDocumentBody text={getPreContractInfoText()} />
    </LegalLayout>
  );
}
