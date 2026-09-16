import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { LegalDocumentBody } from "@/components/legal/LegalDocumentBody";
import { getPrivacyPolicyText } from "@/lib/legal/legal-content";
import { absoluteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "Zelula gizlilik politikası ve kişisel verilerin korunması (KVKK temel bilgilendirme).",
  alternates: { canonical: absoluteUrl("/gizlilik-politikasi") },
};

export default function GizlilikPolitikasiPage() {
  return (
    <LegalLayout title="Gizlilik Politikası">
      <LegalDocumentBody text={getPrivacyPolicyText()} />
    </LegalLayout>
  );
}
