import type { ReactNode } from "react";

export default function LegalSegmentLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[50vh] bg-[color:var(--background)]">{children}</div>;
}
