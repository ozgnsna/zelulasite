"use client";

import type { ReactNode } from "react";
import {
  trackInstagramClick,
  trackTrendyolRedirect,
  trackWhatsAppClick,
} from "@/lib/analytics";

export function TrackedExternalLink({
  href,
  location,
  eventType,
  className,
  children,
}: {
  href: string;
  location: string;
  eventType: "instagram_click" | "whatsapp_click" | "trendyol_redirect";
  className?: string;
  children: ReactNode;
}) {
  const onClick = () => {
    if (eventType === "instagram_click") {
      trackInstagramClick({ location, href });
      return;
    }
    if (eventType === "whatsapp_click") {
      trackWhatsAppClick({ location, href });
      return;
    }
    trackTrendyolRedirect({ location, href });
  };

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
      {children}
    </a>
  );
}
