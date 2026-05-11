"use client";

import { useEffect, useRef } from "react";

/** QNB 3D Host: tarayıcıyı bankanın ödeme sayfasına POST ile yönlendirir. */
export function QnbGatewayAutoPost({
  postUrl,
  fields,
  flowDebug,
}: {
  postUrl: string;
  fields: Record<string, string>;
  flowDebug?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (flowDebug) {
      console.info("[payments] QnbGatewayAutoPost mounted (3DHost → bankaya POST).", { postUrl });
    }
  }, [flowDebug, postUrl]);

  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="font-serif text-xl text-stone-800">Ödeme sayfasına yönlendiriliyorsunuz…</p>
      <p className="mt-3 text-sm text-stone-600">QNB güvenli ödeme ekranı açılmazsa birkaç saniye bekleyip sayfayı yenileyin.</p>
      <form ref={formRef} method="POST" action={postUrl} className="sr-only" aria-hidden>
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} name={name} defaultValue={value} readOnly />
        ))}
      </form>
    </div>
  );
}
