"use client";

import { useEffect } from "react";
import type { AnalyticsItem } from "@/lib/analytics";
import { trackViewItemList } from "@/lib/analytics";

export function ViewItemListTracker({
  listName,
  items,
  listId,
}: {
  listName: string;
  items: AnalyticsItem[];
  listId?: string;
}) {
  useEffect(() => {
    if (items.length > 0) trackViewItemList(listName, items, listId);
  }, [items, listId, listName]);
  return null;
}
