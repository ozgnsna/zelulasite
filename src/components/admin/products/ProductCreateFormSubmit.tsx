"use client";

import { saveProduct, type SaveProductResult } from "@/app/actions/admin";
import { isNextRedirectError } from "@/lib/next-navigation-errors";
import { useEffect, useRef, useState } from "react";

/** Yeni ürün formu: multipart + server action redirect bazen çalışmıyor; kayıt sonrası düzenleme sayfasına yönlendirir. */
export function ProductCreateFormSubmit({ formId, enabled }: { formId: string; enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    const onSubmit = async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if (busyRef.current) return;

      busyRef.current = true;
      setBusy(true);
      const fd = new FormData(form);
      fd.set("_create_nav", "1");

      try {
        const result = (await saveProduct(fd)) as SaveProductResult | void;
        if (result && "ok" in result) {
          if (result.ok && result.redirectTo) {
            window.location.assign(result.redirectTo);
            return;
          }
          if (!result.ok && result.error) {
            const url = new URL("/admin/products/new", window.location.origin);
            url.searchParams.set("productSaveError", result.error);
            window.location.assign(url.toString());
            return;
          }
        }
      } catch (err) {
        if (isNextRedirectError(err)) throw err;
        const message = err instanceof Error ? err.message : "Kayıt sırasında beklenmeyen hata.";
        const url = new URL("/admin/products/new", window.location.origin);
        url.searchParams.set("productSaveError", message);
        window.location.assign(url.toString());
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    };

    form.addEventListener("submit", onSubmit, true);
    return () => form.removeEventListener("submit", onSubmit, true);
  }, [formId, enabled]);

  if (!busy) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-[#fdfcfa]/92 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" aria-hidden />
      <p className="text-sm font-medium text-stone-800">Ürün kaydediliyor…</p>
      <p className="max-w-xs px-6 text-center text-xs text-stone-500">
        Görseller dahil — birkaç saniye sürebilir; sayfayı kapatmayın.
      </p>
    </div>
  );
}
