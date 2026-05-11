"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * React 19 typings omit `defaultOpen` on `<details>`. We set initial `open` in a layout effect
 * so the section can start expanded (e.g. after redirect) while staying native-toggle friendly.
 */
export function ProductFormTrendyolDetailsShell({
  initialOpen,
  id,
  className,
  children,
}: {
  initialOpen: boolean;
  id: string;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.open = initialOpen;
  }, [initialOpen]);

  return (
    <details ref={ref} id={id} className={className}>
      {children}
    </details>
  );
}
