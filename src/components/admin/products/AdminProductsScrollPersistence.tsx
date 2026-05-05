"use client";

import { useEffect } from "react";

const STORAGE_KEY = "zelula_admin_products_scroll_y";

/**
 * Ürün silme (server action + redirect) sonrası sayfa yenilenince en üste sıçramayı önler:
 * silme formu submit edilmeden önce scrollY kaydedilir, dönüşte geri yüklenir.
 */
export function AdminProductsScrollPersistence() {
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }
    if (saved != null) {
      const y = Math.max(0, parseInt(saved, 10) || 0);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      const apply = () => {
        const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo({ top: Math.min(y, maxY), left: 0, behavior: "auto" });
      };
      requestAnimationFrame(() => {
        requestAnimationFrame(apply);
      });
    }

    const onSubmitCapture = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLFormElement)) return;
      if (!target.dataset.saveScrollOnSubmit) return;
      try {
        sessionStorage.setItem(STORAGE_KEY, String(window.scrollY));
      } catch {
        /* private mode / quota */
      }
    };
    document.addEventListener("submit", onSubmitCapture, true);
    return () => document.removeEventListener("submit", onSubmitCapture, true);
  }, []);

  return null;
}
