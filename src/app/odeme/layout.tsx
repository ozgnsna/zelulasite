import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/robots-metadata";

export const metadata: Metadata = privatePageMetadata;

export default function OdemeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
