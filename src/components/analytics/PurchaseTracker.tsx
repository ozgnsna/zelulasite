"use client";

import { useEffect } from "react";
import type { AnalyticsItem } from "@/lib/analytics";
import { trackPurchase } from "@/lib/analytics";

export function PurchaseTracker({
  transactionId,
  value,
  items,
}: {
  transactionId: string;
  value: number;
  items: AnalyticsItem[];
}) {
  useEffect(() => {
    trackPurchase({ transaction_id: transactionId, value, items });
  }, [items, transactionId, value]);
  return null;
}
