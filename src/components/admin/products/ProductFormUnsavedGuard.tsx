"use client";

import { useCallback, useEffect, useRef } from "react";

const LEAVE_CONFIRM = "Kaydedilmemiş değişiklikler var. Çıkmak istediğine emin misin?";

function serializeForm(form: HTMLFormElement): string {
  const parts: string[] = [];
  for (let i = 0; i < form.elements.length; i++) {
    const el = form.elements[i];
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
      continue;
    }
    const name = el.name;
    if (!name) continue;
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      parts.push(`${name}:${el.type}:${el.checked ? "1" : "0"}`);
    } else {
      parts.push(`${name}:${el.value}`);
    }
  }
  parts.sort();
  return parts.join("\x1f");
}

export function ProductFormUnsavedGuard({ formId }: { formId: string }) {
  const initialRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);

  const syncDirty = useCallback(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement) || initialRef.current === null) return;
    dirtyRef.current = serializeForm(form) !== initialRef.current;
  }, [formId]);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    initialRef.current = serializeForm(form);
    dirtyRef.current = false;

    const onField = () => {
      syncDirty();
    };

    const onSubmitCapture = () => {
      dirtyRef.current = false;
    };

    form.addEventListener("input", onField);
    form.addEventListener("change", onField);
    form.addEventListener("submit", onSubmitCapture, true);

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    const onDocumentClickCapture = (e: MouseEvent) => {
      if (!dirtyRef.current) return;
      const raw = e.target;
      const el = raw instanceof Element ? raw : raw instanceof Node ? raw.parentElement : null;
      if (!el || form.contains(el)) return;

      const a = el.closest("a[href]");
      if (!a || !(a instanceof HTMLAnchorElement)) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;

      const hrefAttr = a.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      e.preventDefault();
      e.stopPropagation();
      if (window.confirm(LEAVE_CONFIRM)) {
        dirtyRef.current = false;
        window.location.assign(a.href);
      }
    };

    document.addEventListener("click", onDocumentClickCapture, true);

    return () => {
      form.removeEventListener("input", onField);
      form.removeEventListener("change", onField);
      form.removeEventListener("submit", onSubmitCapture, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClickCapture, true);
    };
  }, [formId, syncDirty]);

  return null;
}
