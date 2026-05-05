import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { LegalDocumentBody } from "@/components/legal/LegalDocumentBody";
import { getReturnPolicyText } from "@/lib/legal/legal-content";

export const metadata: Metadata = {
  title: "İade ve Değişim",
  description: "Zelula iade ve değişim politikası — kolay adımlar ve cayma hakkı özeti.",
};

export default function IadeVeDegisimPage() {
  return (
    <LegalLayout title="İade ve Değişim Politikası">
      <LegalDocumentBody text={getReturnPolicyText()} />
    </LegalLayout>
  );
}
