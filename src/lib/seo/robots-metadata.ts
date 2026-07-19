import type { Metadata } from "next";

/** Sepet, hesap ve ödeme — robots.txt ile birlikte noindex (GSC netliği). */
export const PRIVATE_PAGE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
};

export const privatePageMetadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
};
