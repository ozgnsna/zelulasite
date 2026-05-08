"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { CONSENT_UPDATED_EVENT, getCookieConsent } from "@/lib/cookies/consent";

declare global {
  interface Window {
    __zelulaClarityInitialized?: boolean;
  }
}

export function MicrosoftClarityLoader({
  projectId,
}: {
  projectId: string | null | undefined;
}) {
  const [allow, setAllow] = useState(false);
  const normalizedProjectId = projectId?.trim() ?? "";

  useEffect(() => {
    const sync = () => {
      setAllow(Boolean(normalizedProjectId && getCookieConsent()?.analytics === true));
    };
    sync();
    window.addEventListener(CONSENT_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [normalizedProjectId]);

  if (!normalizedProjectId || !allow) return null;

  return (
    <Script id="clarity-init-consented" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){if(c.__zelulaClarityInitialized){return;}c.__zelulaClarityInitialized=true;c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${normalizedProjectId}");`}
    </Script>
  );
}
