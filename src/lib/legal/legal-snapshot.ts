/**
 * Siparişe yazılan yasal anlık görüntü (JSONB) — tek kaynak.
 *
 * TODO(emails): Sipariş onayı / e-posta gönderimi eklendiğinde, bu nesneden
 * PDF ek üretimi veya müşteri e-postasına gömülü özet için kullanılabilir.
 */

import {
  LEGAL_CONTRACT_VERSION,
  getDistanceSalesContractText,
  getPreContractInfoText,
  getPrivacyPolicyText,
  getReturnPolicyText,
} from "@/lib/legal/legal-content";

export type LegalContractSnapshotDocuments = {
  distanceSalesContract: string;
  preContractInfo: string;
  returnPolicy: string;
  privacyPolicy: string;
};

export type LegalContractSnapshot = {
  version: typeof LEGAL_CONTRACT_VERSION;
  acceptedAt: string;
  documents: LegalContractSnapshotDocuments;
};

export function buildLegalSnapshot(acceptedAt: string): LegalContractSnapshot {
  return {
    version: LEGAL_CONTRACT_VERSION,
    acceptedAt,
    documents: {
      distanceSalesContract: getDistanceSalesContractText(),
      preContractInfo: getPreContractInfoText(),
      returnPolicy: getReturnPolicyText(),
      privacyPolicy: getPrivacyPolicyText(),
    },
  };
}

/** Veritabanından gelen JSONB için güvenli ayrıştırma (Hesabım / yönetim). */
export function parseLegalContractSnapshot(raw: unknown): LegalContractSnapshot | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.acceptedAt !== "string" || !o.acceptedAt.trim()) return null;
  if (typeof o.version !== "string" || !o.version.trim()) return null;
  const docs = o.documents;
  if (docs == null || typeof docs !== "object") return null;
  const d = docs as Record<string, unknown>;
  const keys = ["distanceSalesContract", "preContractInfo", "returnPolicy", "privacyPolicy"] as const;
  for (const k of keys) {
    if (typeof d[k] !== "string") return null;
  }
  return {
    version: o.version as LegalContractSnapshot["version"],
    acceptedAt: o.acceptedAt,
    documents: {
      distanceSalesContract: d.distanceSalesContract as string,
      preContractInfo: d.preContractInfo as string,
      returnPolicy: d.returnPolicy as string,
      privacyPolicy: d.privacyPolicy as string,
    },
  };
}
