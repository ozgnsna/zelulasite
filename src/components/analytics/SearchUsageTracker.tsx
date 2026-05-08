"use client";

import { useEffect } from "react";
import { trackSearchUsage } from "@/lib/analytics";

type FilterValue = string | number | boolean | null;

export function SearchUsageTracker({
  query,
  location,
  resultsCount,
  filters,
}: {
  query: string;
  location: string;
  resultsCount?: number;
  filters?: Record<string, FilterValue>;
}) {
  useEffect(() => {
    trackSearchUsage({
      query,
      location,
      results_count: resultsCount,
      filters,
    });
  }, [filters, location, query, resultsCount]);

  return null;
}
