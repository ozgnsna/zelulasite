"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    iFrameResize?: (options: Record<string, unknown>, target: string | HTMLElement) => void;
  }
}

const RESIZER_SRC = "https://www.paytr.com/js/iframeResizer.min.js";

/** PayTR güvenli ödeme ekranını gömülü gösterir ve yüksekliğini otomatik ayarlar. */
export function PaytrIframe({ iframeUrl }: { iframeUrl: string }) {
  const initialized = useRef(false);

  useEffect(() => {
    const resize = () => {
      if (initialized.current) return;
      if (typeof window.iFrameResize === "function") {
        window.iFrameResize({}, "#paytriframe");
        initialized.current = true;
      }
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RESIZER_SRC}"]`);
    if (existing) {
      resize();
      existing.addEventListener("load", resize);
      return () => existing.removeEventListener("load", resize);
    }

    const script = document.createElement("script");
    script.src = RESIZER_SRC;
    script.async = true;
    script.addEventListener("load", resize);
    document.body.appendChild(script);
    return () => script.removeEventListener("load", resize);
  }, []);

  return (
    <iframe
      src={iframeUrl}
      id="paytriframe"
      title="PayTR güvenli ödeme"
      frameBorder={0}
      scrolling="no"
      style={{ width: "100%", minHeight: "600px", border: "none" }}
    />
  );
}
