"use client";

import { useEffect } from "react";
import type { AnalyticsItem } from "@/lib/analytics";
import { trackViewItem } from "@/lib/analytics";

export function ViewItemTracker({ item }: { item: AnalyticsItem }) {
  useEffect(() => {
    trackViewItem(item);
  }, [item]);
  return null;
}
