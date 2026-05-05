"use client";

import type { ReactNode } from "react";

export function TrendyolFieldJumpLink({
  fieldId,
  children,
  className,
}: {
  fieldId: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`inline cursor-pointer border-0 bg-transparent p-0 text-left font-inherit leading-snug ${className ?? ""}`}
      onClick={() => {
        const el = document.getElementById(fieldId);
        if (el instanceof HTMLElement) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus({ preventScroll: true });
        }
      }}
    >
      {children}
    </button>
  );
}
